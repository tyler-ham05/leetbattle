import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { EncryptJWT } from 'jose';
import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import { createLobbyService } from '../src/server';
import type { LobbySnapshot } from '../src/lobby-state';

const SECRET = 'local-test-secret-'.padEnd(64, 'x');
let connectedClients: Socket[] = [];
let lobbyService: ReturnType<typeof createLobbyService>;
let socketUrl = '';

async function tokenFor(userId: string): Promise<string> {
	return new EncryptJWT({ id: userId, email: `${userId}@example.test` })
		.setProtectedHeader({ alg: 'dir', enc: 'A256CBC-HS512' })
		.setIssuedAt()
		.setExpirationTime('5m')
		.encrypt(new TextEncoder().encode(SECRET));
}

function nextEvent<T>(socket: Socket, event: string, timeoutMs = 2_000): Promise<T> {
	return new Promise((resolve, reject) => {
		const timeout = setTimeout(() => reject(new Error(`Timed out waiting for ${event}`)), timeoutMs);
		socket.once(event, (value: T) => {
			clearTimeout(timeout);
			resolve(value);
		});
	});
}

function nextLobbyState(socket: Socket, predicate: (_state: LobbySnapshot) => boolean = () => true): Promise<LobbySnapshot> {
	return new Promise((resolve, reject) => {
		const timeout = setTimeout(() => {
			socket.off('lobby:state', onState);
			reject(new Error('Timed out waiting for the expected lobby state'));
		}, 2_000);
		const onState = (state: LobbySnapshot) => {
			if (!predicate(state)) return;
			clearTimeout(timeout);
			socket.off('lobby:state', onState);
			resolve(state);
		};
		socket.on('lobby:state', onState);
	});
}

async function connectUser(userId: string, options: { invalidToken?: boolean } = {}): Promise<Socket> {
	const token = options.invalidToken ? 'invalid-token' : await tokenFor(userId);
	const client = io(socketUrl, {
		autoConnect: false,
		reconnection: false,
		transports: ['websocket'],
		auth: { token, displayName: `Player ${userId}` },
	});
	connectedClients.push(client);
	const initialState = nextEvent<LobbySnapshot>(client, 'lobby:state');
	client.connect();
	await initialState;
	return client;
}

async function emitAndWaitForState(
	socket: Socket,
	event: string,
	payload?: unknown,
	predicate: (_state: LobbySnapshot) => boolean = () => true,
): Promise<LobbySnapshot> {
	const state = nextLobbyState(socket, predicate);
	socket.emit(event, payload);
	return state;
}

beforeEach(async () => {
	connectedClients = [];
	process.env.SECRET = SECRET;
	lobbyService = createLobbyService({ disconnectGraceMs: 500, origins: ['http://localhost:3000'] });
	await new Promise<void>((resolve) => lobbyService.httpServer.listen(0, '127.0.0.1', resolve));
	const address = lobbyService.httpServer.address();
	if (!address || typeof address === 'string') throw new Error('Lobby test server did not bind a TCP port.');
	socketUrl = `http://127.0.0.1:${address.port}`;
});

afterEach(async () => {
	for (const client of connectedClients) client.disconnect();
	await lobbyService.close();
});

describe('LobbyService socket lifecycle', () => {
	it('rejects connections without a valid login token', async () => {
		const client = createUnauthenticatedClient();
		const token = nextEvent<Error>(client, 'connect_error');
		client.connect();
		await expect(token).resolves.toMatchObject({ message: 'unauthorized' });
	});

	it('caps the lobby at six unique players and treats a repeated join as idempotent', async () => {
		const clients = await Promise.all(Array.from({ length: 7 }, (_, index) => connectUser(`capacity-${index}`)));
		for (const [index, client] of clients.slice(0, 6).entries()) {
			await emitAndWaitForState(client, 'lobby:join', undefined, (state) => state.playerCount === index + 1);
		}

		const duplicateJoin = await emitAndWaitForState(clients[0], 'lobby:join');
		expect(duplicateJoin.playerCount).toBe(6);

		const fullError = nextEvent<{ code: string }>(clients[6], 'lobby:error');
		clients[6].emit('lobby:join');
		expect(await fullError).toMatchObject({ code: 'lobby-full' });
	});

	it('enforces team capacity and emits a ready roster without owning match creation', async () => {
		const clients = await Promise.all(Array.from({ length: 6 }, (_, index) => connectUser(`teams-${index}`)));
		for (const [index, client] of clients.entries()) {
			await emitAndWaitForState(client, 'lobby:join', undefined, (state) => state.playerCount === index + 1);
		}
		for (const client of clients.slice(0, 3)) {
			const userId = clients.indexOf(client) < 3 ? `teams-${clients.indexOf(client)}` : '';
			await emitAndWaitForState(client, 'lobby:join-team', 'a', (state) => state.players.find((player) => player.userId === userId)?.team === 'a');
		}
		for (const client of clients.slice(3, 6)) {
			const userId = `teams-${clients.indexOf(client)}`;
			await emitAndWaitForState(client, 'lobby:join-team', 'b', (state) => state.players.find((player) => player.userId === userId)?.team === 'b');
		}

		const fullTeamError = nextEvent<{ code: string }>(clients[3], 'lobby:error');
		clients[3].emit('lobby:join-team', 'a');
		expect(await fullTeamError).toMatchObject({ code: 'team-full' });

		const readinessEvents = Promise.all(clients.map((client) => nextEvent<{ lobbyId: string; players: { userId: string }[] }>(client, 'lobby:ready-for-match', 7_000)));
		for (const [index, client] of clients.entries()) {
			await emitAndWaitForState(client, 'lobby:set-ready', true, (state) => state.readyCount === index + 1);
		}
		const events = await readinessEvents;
		expect(events.every((event) => event.lobbyId === 'main' && event.players.length === 6)).toBe(true);
		expect(new Set(events.flatMap((event) => event.players.map((player) => player.userId))).size).toBe(6);
		expect(clients.every((client) => client.connected)).toBe(true);
		expect(lobbyService.lobby.snapshot().readyToStart).toBe(true);
	});

	it('allows a player to switch teams when the destination has space', async () => {
		const clients = await Promise.all(Array.from({ length: 3 }, (_, index) => connectUser(`switch-${index}`)));
		for (const [index, client] of clients.entries()) {
			await emitAndWaitForState(client, 'lobby:join', undefined, (state) => state.playerCount === index + 1);
		}
		await emitAndWaitForState(clients[0], 'lobby:join-team', 'a', (state) => state.players.find((player) => player.userId === 'switch-0')?.team === 'a');
		await emitAndWaitForState(clients[1], 'lobby:join-team', 'a', (state) => state.players.find((player) => player.userId === 'switch-1')?.team === 'a');
		await emitAndWaitForState(clients[2], 'lobby:join-team', 'b', (state) => state.players.find((player) => player.userId === 'switch-2')?.team === 'b');

		const state = await emitAndWaitForState(clients[2], 'lobby:join-team', 'a', (snapshot) => snapshot.players.find((player) => player.userId === 'switch-2')?.team === 'a');
		expect(state.players.find((player) => player.userId === 'switch-2')?.team).toBe('a');
	});

	it('releases a lobby seat on leave and broadcasts the new count', async () => {
		const clients = await Promise.all(['leave-0', 'leave-1'].map((userId) => connectUser(userId)));
		await emitAndWaitForState(clients[0], 'lobby:join', undefined, (state) => state.playerCount === 1);
		await emitAndWaitForState(clients[1], 'lobby:join', undefined, (state) => state.playerCount === 2);

		const state = await emitAndWaitForState(clients[0], 'lobby:leave', undefined, (snapshot) =>
			snapshot.playerCount === 1 && !snapshot.players.some((player) => player.userId === 'leave-0'));
		expect(state.playerCount).toBe(1);
	});

	it('retains a player briefly across disconnect and reconnect', async () => {
		const player = await connectUser('refresh-player');
		const observer = await connectUser('refresh-observer');
		await emitAndWaitForState(player, 'lobby:join');
		const offlineState = nextLobbyState(observer, (state) => state.players.find((entry) => entry.userId === 'refresh-player')?.connected === false);
		player.disconnect();
		expect((await offlineState).players.find((entry) => entry.userId === 'refresh-player')?.connected).toBe(false);

		const reconnected = await connectUser('refresh-player');
		const state = await emitAndWaitForState(reconnected, 'lobby:join', undefined, (snapshot) => snapshot.players.find((entry) => entry.userId === 'refresh-player')?.connected === true);
		expect(state.playerCount).toBe(1);
		expect(state.players[0]).toMatchObject({ userId: 'refresh-player', connected: true });
	});

	it('removes a player who does not reconnect before the grace period ends', async () => {
		const player = await connectUser('leaving-player');
		const observer = await connectUser('leaving-observer');
		await emitAndWaitForState(player, 'lobby:join');
		const afterExpiry = nextLobbyState(observer, (state) => state.playerCount === 0);
		player.disconnect();
		expect((await afterExpiry).playerCount).toBe(0);
	});
});

function createUnauthenticatedClient(): Socket {
	const client = io(socketUrl, {
		autoConnect: false,
		reconnection: false,
		transports: ['websocket'],
		auth: {},
	});
	connectedClients.push(client);
	return client;
}
