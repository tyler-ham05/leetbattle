// US-7-T-2: shared setup for the QueueService tests.
// Each test starts a fresh QueueService on a random port and talks to it with
// real socket.io clients. GameService is never started: fetch is stubbed so
// PUT /game answers "game-1", "game-2", ..., and tests read the requests back.
import { afterEach, beforeEach, vi } from 'vitest';
import type { Mock } from 'vitest';
import { EncryptJWT } from 'jose';
import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import { createQueueService } from '../src/server';

export type QueueMode = '1v1' | '2v2' | '3v3';

// `queue:state` payload: this client's queue (or null) and per-queue counts.
export interface QueueState {
	queue: QueueMode | null;
	counts: Record<QueueMode, number>;
}

// `queue:matched` payload. yourTeam/rivals are optional here only so tests
// written before US-10-T-10 keep type-checking; the new tests assert them.
export interface MatchedPayload {
	gameId: string;
	yourTeam?: string[];
	rivals?: string[];
}

export interface GamePlayer {
	userId: string;
	displayName: string;
	team: 'a' | 'b';
}

export const GAME_SERVICE_URL = 'http://localhost:4004';
export const LOBBY_SERVICE_URL = 'http://localhost:4003';
const SECRET = 'local-test-secret-'.padEnd(64, 'x');

let queueService: ReturnType<typeof createQueueService>;
let socketUrl = '';
let clients: Socket[] = [];
const latestStates = new Map<Socket, QueueState>();
let gameCount = 0;

export let gameServiceFetch: Mock;

export function gameServiceResponse(status: number, body: unknown): Response {
	return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

export function createdGame(): Promise<Response> {
	gameCount += 1;
	return Promise.resolve(gameServiceResponse(201, { gameId: `game-${gameCount}` }));
}

beforeEach(async () => {
	clients = [];
	latestStates.clear();
	gameCount = 0;
	process.env.SECRET = SECRET;
	gameServiceFetch = vi.fn(createdGame);
	vi.stubGlobal('fetch', gameServiceFetch);
	queueService = createQueueService({ origins: ['http://localhost:3000'], gameServiceUrl: GAME_SERVICE_URL });
	await new Promise<void>((resolve) => queueService.httpServer.listen(0, '127.0.0.1', resolve));
	const address = queueService.httpServer.address();
	if (!address || typeof address === 'string') throw new Error('Queue test server did not bind a TCP port.');
	socketUrl = `http://127.0.0.1:${address.port}`;
});

afterEach(async () => {
	for (const client of clients) client.disconnect();
	await queueService.close();
	vi.unstubAllGlobals();
});

export async function tokenFor(userId: string): Promise<string> {
	return new EncryptJWT({ id: userId, email: `${userId}@example.test` })
		.setProtectedHeader({ alg: 'dir', enc: 'A256CBC-HS512' })
		.setIssuedAt()
		.setExpirationTime('5m')
		.encrypt(new TextEncoder().encode(SECRET));
}

export function nextEvent<T>(socket: Socket, event: string, timeoutMs = 2_000): Promise<T> {
	return new Promise((resolve, reject) => {
		const timeout = setTimeout(() => reject(new Error(`Timed out waiting for ${event}`)), timeoutMs);
		socket.once(event, (value: T) => {
			clearTimeout(timeout);
			resolve(value);
		});
	});
}

export function nextState(socket: Socket, predicate: (_state: QueueState) => boolean, timeoutMs = 2_000): Promise<QueueState> {
	return new Promise((resolve, reject) => {
		const timeout = setTimeout(() => {
			socket.off('queue:state', onState);
			reject(new Error('Timed out waiting for the expected queue state'));
		}, timeoutMs);
		const onState = (state: QueueState) => {
			if (!predicate(state)) return;
			clearTimeout(timeout);
			socket.off('queue:state', onState);
			resolve(state);
		};
		socket.on('queue:state', onState);
	});
}

// `auth` adds handshake fields, e.g. a spoofed userId.
export async function connectUser(userId: string, auth: Record<string, unknown> = {}): Promise<Socket> {
	const client = io(socketUrl, {
		autoConnect: false,
		reconnection: false,
		transports: ['websocket'],
		auth: { token: await tokenFor(userId), displayName: `Player ${userId}`, ...auth },
	});
	clients.push(client);
	client.on('queue:state', (state: QueueState) => latestStates.set(client, state));
	const initialState = nextEvent<QueueState>(client, 'queue:state');
	client.connect();
	await initialState;
	return client;
}

export function connectWithInvalidToken(): Promise<string> {
	const client = io(socketUrl, {
		autoConnect: false,
		reconnection: false,
		transports: ['websocket'],
		auth: { token: 'invalid-token', displayName: 'Intruder' },
	});
	clients.push(client);
	const error = new Promise<string>((resolve) => client.once('connect_error', (connectError: Error) => resolve(connectError.message)));
	client.connect();
	return error;
}

export function connectPlayers(prefix: string, count: number): Promise<Socket[]> {
	return Promise.all(Array.from({ length: count }, (_, index) => connectUser(`${prefix}-${index}`)));
}

export function joinQueue(client: Socket, mode: QueueMode): Promise<QueueState> {
	const confirmed = nextState(client, (state) => state.queue === mode);
	client.emit('queue:join', mode);
	return confirmed;
}

// One at a time, so join order is known.
export async function joinInOrder(players: Socket[], mode: QueueMode): Promise<void> {
	for (const player of players) await joinQueue(player, mode);
}

// Like joinInOrder, but the last join fills the queue; resolves with each `queue:matched`.
export async function joinUntilMatched(players: Socket[], mode: QueueMode): Promise<MatchedPayload[]> {
	const matched = players.map((player) => nextEvent<MatchedPayload>(player, 'queue:matched'));
	for (const player of players.slice(0, -1)) await joinQueue(player, mode);
	players[players.length - 1].emit('queue:join', mode);
	return Promise.all(matched);
}

export function joinAtOnce(players: Socket[], mode: QueueMode): void {
	for (const player of players) player.emit('queue:join', mode);
}

export function latestState(client: Socket): QueueState | undefined {
	return latestStates.get(client);
}

export function settle(ms = 300): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

export function gameRequests(): GamePlayer[][] {
	return gameServiceFetch.mock.calls.map(([, init]) => (JSON.parse(String((init as RequestInit).body)) as { players: GamePlayer[] }).players);
}

export function everyMatchedUserId(): string[] {
	return gameRequests().flat().map((player) => player.userId).sort();
}

export function requestedUrls(): string[] {
	return gameServiceFetch.mock.calls.map(([url]) => String(url));
}

export function userIds(prefix: string, count: number): string[] {
	return Array.from({ length: count }, (_, index) => `${prefix}-${index}`).sort();
}
