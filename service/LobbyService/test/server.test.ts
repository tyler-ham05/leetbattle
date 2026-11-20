import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';
import { EncryptJWT } from 'jose';
import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import { createLobbyService } from '../src/server';
import type { LobbySnapshot } from '../src/lobby-state';

const GAME_SERVICE_URL = 'http://localhost:4004';

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

function expectNoEvent(socket: Socket, event: string, waitMs: number): Promise<void> {
	return new Promise((resolve, reject) => {
		const timeout = setTimeout(() => {
			socket.off(event, onEvent);
			resolve();
		}, waitMs);
		const onEvent = () => {
			clearTimeout(timeout);
			reject(new Error(`Unexpectedly received ${event}`));
		};
		socket.once(event, onEvent);
	});
}

// Six players join the lobby. The first `teamedPlayers` of them pick a team
// (indexes 0-2 join Team 1, 3-5 join Team 2); the rest stay without a team.
async function createFullLobby(prefix: string, teamedPlayers = 6): Promise<Socket[]> {
	const clients = await Promise.all(Array.from({ length: 6 }, (_, index) => connectUser(`${prefix}-${index}`)));
	for (const [index, client] of clients.entries()) {
		await emitAndWaitForState(client, 'lobby:join', undefined, (state) => state.playerCount === index + 1);
	}
	for (const [index, client] of clients.slice(0, teamedPlayers).entries()) {
		const team: 'a' | 'b' = index < 3 ? 'a' : 'b';
		const userId = `${prefix}-${index}`;
		await emitAndWaitForState(client, 'lobby:join-team', team, (state) => state.players.find((player) => player.userId === userId)?.team === team);
	}
	return clients;
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

// US-6-T-2: once the countdown completes the lobby calls GameService's
// PUT /game, so every suite runs against a stand-in for GameService rather
// than a live one. By default it answers 201 with a fixed game id; tests
// that need a failure swap the implementation for that test only.
let gameServiceFetch: Mock;

function gameServiceResponse(status: number, body: unknown): Response {
	return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

// (Re)creates the lobby under test on a fresh random port. The default
// options match production apart from a short disconnect grace; suites that
// need a quicker countdown or a specific GameService URL pass overrides.
async function startLobbyService(options: Parameters<typeof createLobbyService>[0] = {}): Promise<void> {
	await lobbyService?.close();
	lobbyService = createLobbyService({ disconnectGraceMs: 500, origins: ['http://localhost:3000'], ...options });
	await new Promise<void>((resolve) => lobbyService.httpServer.listen(0, '127.0.0.1', resolve));
	const address = lobbyService.httpServer.address();
	if (!address || typeof address === 'string') throw new Error('Lobby test server did not bind a TCP port.');
	socketUrl = `http://127.0.0.1:${address.port}`;
}

beforeEach(async () => {
	connectedClients = [];
	process.env.SECRET = SECRET;
	gameServiceFetch = vi.fn(() => Promise.resolve(gameServiceResponse(201, { gameId: 'stub-game-id' })));
	vi.stubGlobal('fetch', gameServiceFetch);
	await startLobbyService();
});

afterEach(async () => {
	for (const client of connectedClients) client.disconnect();
	await lobbyService.close();
	vi.unstubAllGlobals();
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

	it('US-1-T-1 enforces team capacity, broadcasts the countdown, and emits a ready roster', async () => {
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

		// GameService never answers in this test, so the lobby stays exactly as it is
		// the moment ready-for-match goes out (once it answers, the lobby sockets close).
		gameServiceFetch.mockReturnValue(new Promise(() => undefined));

		// An authenticated client can observe the lobby without taking one of its seats.
		const observer = await connectUser('teams-observer');
		const lobbyClients = [...clients, observer];
		const readinessEvents = Promise.all(lobbyClients.map((client) => nextEvent<{ lobbyId: string; players: { userId: string }[] }>(client, 'lobby:ready-for-match', 7_000)));
		for (const [index, client] of clients.slice(0, 5).entries()) {
			await emitAndWaitForState(client, 'lobby:set-ready', true, (state) => state.readyCount === index + 1);
		}
		const countdownStates = Promise.all(lobbyClients.map((client) => nextLobbyState(client, (state) =>
			typeof (state as LobbySnapshot & { countdownSecondsRemaining?: number | null }).countdownSecondsRemaining === 'number')));
		await emitAndWaitForState(clients[5], 'lobby:set-ready', true, (state) => state.readyCount === 6);
		const statesDuringCountdown = await countdownStates;
		expect(statesDuringCountdown.every((state) => {
			const seconds = (state as LobbySnapshot & { countdownSecondsRemaining?: number | null }).countdownSecondsRemaining;
			return typeof seconds === 'number' && seconds > 0 && seconds <= 5;
		})).toBe(true);
		const events = await readinessEvents;
		expect(events.every((event) => event.lobbyId === 'main' && event.players.length === 6)).toBe(true);
		expect(new Set(events.flatMap((event) => event.players.map((player) => player.userId))).size).toBe(6);
		expect(lobbyClients.every((client) => client.connected)).toBe(true);
		expect(lobbyService.lobby.snapshot().readyToStart).toBe(true);
	}, 12_000);

	it('US-1-T-1 rejects ready-up until all six players fill both teams', async () => {
		const client = await connectUser('US-1-T-1-incomplete');
		await emitAndWaitForState(client, 'lobby:join');

		const error = nextEvent<{ code: string }>(client, 'lobby:error');
		client.emit('lobby:set-ready', true);
		expect(await error).toMatchObject({ code: 'lobby-not-ready' });
	});

	it('US-1-T-1 rejects ready-up when six players have joined but a team is not full', async () => {
		// All six seats are taken, but only five players picked a team, so Team 2 has two players.
		const clients = await createFullLobby('US-1-T-1-teamless', 5);

		// A player on a full team tries to ready up anyway.
		const error = nextEvent<{ code: string }>(clients[0], 'lobby:error');
		clients[0].emit('lobby:set-ready', true);

		// The server refuses because both teams must have three players.
		expect(await error).toMatchObject({ code: 'lobby-not-ready' });
	});

	it('US-1-T-1 rejects ready-up when a player in a full lobby is disconnected', async () => {
		// Both teams are full, then one player drops. They keep their seat during the grace period.
		const clients = await createFullLobby('US-1-T-1-offline');
		const offlineState = nextLobbyState(clients[0], (state) =>
			state.players.some((player) => player.userId === 'US-1-T-1-offline-5' && !player.connected));
		clients[5].disconnect();
		await offlineState;

		// A connected player tries to ready up while their teammate is offline.
		const error = nextEvent<{ code: string }>(clients[0], 'lobby:error');
		clients[0].emit('lobby:set-ready', true);

		// The server refuses because every player must be connected.
		expect(await error).toMatchObject({ code: 'lobby-not-ready' });
	});

	it('US-1-T-1 cancels the countdown when a player becomes unready', async () => {
		const clients = await createFullLobby('US-1-T-1-unready');
		const observer = await connectUser('US-1-T-1-unready-observer');
		const lobbyClients = [...clients, observer];
		for (const client of clients.slice(0, 5)) await emitAndWaitForState(client, 'lobby:set-ready', true);
		const noMatchStart = expectNoEvent(clients[0], 'lobby:ready-for-match', 5_200);
		await emitAndWaitForState(clients[5], 'lobby:set-ready', true);

		const updatedStates = Promise.all(lobbyClients.map((client) => nextLobbyState(client, (state) =>
			state.readyCount === 5
			&& (state as LobbySnapshot & { countdownSecondsRemaining?: number | null }).countdownSecondsRemaining === null)));
		await emitAndWaitForState(clients[0], 'lobby:set-ready', false);
		const states = await updatedStates;
		expect(states.every((state) => state.readyCount === 5
			&& (state as LobbySnapshot & { countdownSecondsRemaining?: number | null }).countdownSecondsRemaining === null)).toBe(true);
		await noMatchStart;
	}, 8_000);

	it('US-1-T-1 cancels the countdown when a player disconnects', async () => {
		const clients = await createFullLobby('US-1-T-1-disconnect');
		for (const client of clients) await emitAndWaitForState(client, 'lobby:set-ready', true);
		const noMatchStart = expectNoEvent(clients[0], 'lobby:ready-for-match', 5_200);
		const disconnectedState = nextLobbyState(clients[0], (state) =>
			state.players.some((player) => player.userId === 'US-1-T-1-disconnect-5' && !player.connected)
			&& (state as LobbySnapshot & { countdownSecondsRemaining?: number | null }).countdownSecondsRemaining === null);
		clients[5].disconnect();
		expect((await disconnectedState).readyCount).toBe(5);
		await noMatchStart;
	}, 8_000);

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

async function readyUpAll(clients: Socket[]): Promise<void> {
	for (const [index, client] of clients.entries()) {
		await emitAndWaitForState(client, 'lobby:set-ready', true, (state) => state.readyCount === index + 1);
	}
}

// GameService is stubbed by the top-level beforeEach (gameServiceFetch),
// since every suite that completes a countdown now reaches it.
describe('Lobbyservice makes request to GameService', () => {
	it('makes a request with correct body', async () => {
		const clients = await createFullLobby('request');

		const readinessEvents = Promise.all(clients.map((client) => nextEvent(client, 'lobby:ready-for-match', 7_000)));
		await readyUpAll(clients);
		await readinessEvents;

		expect(gameServiceFetch).toHaveBeenCalledWith(
			`${GAME_SERVICE_URL}/game`,
			expect.objectContaining({
				method: 'PUT',
				body: JSON.stringify({
					players: Array.from({ length: 6 }, (_, index) => ({
						userId: `request-${index}`,
						displayName: `Player request-${index}`,
						team: index < 3 ? 'a' : 'b',
					})),
				}),
			}),
		);
	}, 10_000);

	it('emits the new games id over the websocket once GameService responds', async () => {
		const clients = await createFullLobby('gameid');

		const gameStarted = nextEvent<{ gameId: string }>(clients[0], 'lobby:game-started', 7_000);
		await readyUpAll(clients);

		expect((await gameStarted).gameId).toBe('stub-game-id');
	}, 10_000);

	it('closes each player\'s socket once the game starts', async () => {
		const clients = await createFullLobby('close');

		const disconnections = Promise.all(clients.map((client) => new Promise<void>((resolve) => {
			client.once('disconnect', () => resolve());
		})));
		await readyUpAll(clients);
		await disconnections;

		expect(clients.every((client) => client.connected)).toBe(false);
	}, 10_000);
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

// Lobby should let the host choose how many players are on each team
//  - A new lobby should default to three players per team
//  - The first player to join the lobby should be the host
//  - When the host leaves, the next player who joined should become the host
//  - When the host sets the team size to 2, every lobby client should see a team size of 2
//  - A player who is not the host should receive a "not-host" error when changing the team size
//  - A team size of 4 should be rejected with an "invalid-team-size" error
//  - A team size of 0 should be rejected with an "invalid-team-size" error
// Lobby should use the chosen team size for capacity and readiness
//  - With a team size of 2, a third player joining a team should receive a "team-full" error
//  - With a team size of 1, two connected players on opposite teams should be able to ready up
// Lobby should remove extra players when the team size shrinks
//  - When a team has more players than the new team size, random players should be moved off it until it fits
//  - A player moved off a team should stay in the lobby without a team when the lobby has room
//  - When the lobby has more players than the new size allows, random players should be removed until it fits
//  - The host should never be removed from the lobby when the team size shrinks
//  - Changing the team size should reset every player's ready state
describe('team size', () => {
	type SizedSnapshot = LobbySnapshot & { teamSize: number; hostId: string | null };

	// Connects and joins `count` players in index order, so `${prefix}-0` is the host.
	async function joinPlayers(prefix: string, count: number): Promise<Socket[]> {
		const clients = await Promise.all(Array.from({ length: count }, (_, index) => connectUser(`${prefix}-${index}`)));
		for (const [index, client] of clients.entries()) {
			await emitAndWaitForState(client, 'lobby:join', undefined, (state) => state.playerCount === index + 1);
		}
		return clients;
	}

	// Puts each listed client on the given team, in order.
	async function assignTeams(prefix: string, clients: Socket[], teams: ('a' | 'b')[]): Promise<void> {
		for (const [index, team] of teams.entries()) {
			const userId = `${prefix}-${index}`;
			await emitAndWaitForState(clients[index], 'lobby:join-team', team, (state) => state.players.find((player) => player.userId === userId)?.team === team);
		}
	}

	// The host changes the team size; resolves with the first state showing it.
	function setTeamSize(host: Socket, size: number): Promise<SizedSnapshot> {
		return emitAndWaitForState(host, 'lobby:set-team-size', size, (state) => (state as SizedSnapshot).teamSize === size) as Promise<SizedSnapshot>;
	}

	it('defaults a new lobby to three players per team', async () => {
		const client = await connectUser('size-default');
		const state = await emitAndWaitForState(client, 'lobby:join') as SizedSnapshot;
		expect(state.teamSize).toBe(3);
	});

	it('makes the first player to join the host', async () => {
		const clients = await joinPlayers('size-host', 2);
		const state = await emitAndWaitForState(clients[1], 'lobby:set-name', 'Second') as SizedSnapshot;
		expect(state.hostId).toBe('size-host-0');
	});

	it('passes the host to the next player who joined when the host leaves', async () => {
		const clients = await joinPlayers('size-handover', 3);
		// Wait for the state where the host has actually left (two players
		// remain), as seen by a player who stays. Taking the very next state
		// could pick up the third player's late join broadcast instead, which
		// still has the old host and made this test flaky in CI.
		const afterLeave = nextLobbyState(clients[1], (state) => state.playerCount === 2) as Promise<SizedSnapshot>;
		clients[0].emit('lobby:leave');
		expect((await afterLeave).hostId).toBe('size-handover-1');
	});

	it('shows the new team size to every lobby client', async () => {
		const clients = await joinPlayers('size-broadcast', 2);
		const seen = nextLobbyState(clients[1], (state) => (state as SizedSnapshot).teamSize === 2) as Promise<SizedSnapshot>;
		clients[0].emit('lobby:set-team-size', 2);
		expect((await seen).teamSize).toBe(2);
	});

	it('rejects a team size change from a player who is not the host', async () => {
		const clients = await joinPlayers('size-not-host', 2);
		const error = nextEvent<{ code: string }>(clients[1], 'lobby:error');
		clients[1].emit('lobby:set-team-size', 2);
		expect(await error).toMatchObject({ code: 'not-host' });
	});

	it('rejects a team size of 4', async () => {
		const [host] = await joinPlayers('size-four', 1);
		const error = nextEvent<{ code: string }>(host, 'lobby:error');
		host.emit('lobby:set-team-size', 4);
		expect(await error).toMatchObject({ code: 'invalid-team-size' });
	});

	it('rejects a team size of 0', async () => {
		const [host] = await joinPlayers('size-zero', 1);
		const error = nextEvent<{ code: string }>(host, 'lobby:error');
		host.emit('lobby:set-team-size', 0);
		expect(await error).toMatchObject({ code: 'invalid-team-size' });
	});

	it('caps each team at the chosen size', async () => {
		const clients = await joinPlayers('size-cap', 3);
		await setTeamSize(clients[0], 2);
		await assignTeams('size-cap', clients, ['a', 'a']);
		const error = nextEvent<{ code: string }>(clients[2], 'lobby:error');
		clients[2].emit('lobby:join-team', 'a');
		expect(await error).toMatchObject({ code: 'team-full' });
	});

	it('lets a 1v1 lobby ready up', async () => {
		const clients = await joinPlayers('size-one', 2);
		await setTeamSize(clients[0], 1);
		await assignTeams('size-one', clients, ['a', 'b']);
		const state = await emitAndWaitForState(clients[0], 'lobby:set-ready', true, (lobby) => lobby.readyCount === 1);
		expect(state.players.find((player) => player.userId === 'size-one-0')?.ready).toBe(true);
	});

	it('moves random players off a team that is over the new size', async () => {
		// Team 1 has three players and Team 2 has one; shrinking to 2 leaves Team 1 one over.
		const clients = await joinPlayers('size-trim', 4);
		await assignTeams('size-trim', clients, ['a', 'a', 'a', 'b']);
		const state = await setTeamSize(clients[0], 2);
		expect(state.players.filter((player) => player.team === 'a')).toHaveLength(2);
	});

	it('keeps a player moved off a team in the lobby without a team', async () => {
		const clients = await joinPlayers('size-teamless', 4);
		await assignTeams('size-teamless', clients, ['a', 'a', 'a', 'b']);
		const state = await setTeamSize(clients[0], 2);
		// Four players still fit a 2v2 lobby, so the moved player stays, just without a team.
		expect(state.players.filter((player) => player.team === null)).toHaveLength(1);
	});

	it('removes random players when the lobby is over the new size', async () => {
		const clients = await createFullLobby('size-shrink');
		const state = await setTeamSize(clients[0], 2);
		expect(state.playerCount).toBe(4);
	});

	it('never removes the host when the lobby shrinks', async () => {
		const clients = await createFullLobby('size-keep-host');
		const state = await setTeamSize(clients[0], 1);
		expect(state.players.some((player) => player.userId === 'size-keep-host-0')).toBe(true);
	});

	it('resets every player\'s ready state when the team size changes', async () => {
		const clients = await joinPlayers('size-unready', 2);
		await setTeamSize(clients[0], 1);
		await assignTeams('size-unready', clients, ['a', 'b']);
		await emitAndWaitForState(clients[1], 'lobby:set-ready', true, (lobby) => lobby.readyCount === 1);
		const state = await setTeamSize(clients[0], 2);
		expect(state.readyCount).toBe(0);
	});
});

// US-6-T-2: Lobby should start a game on GameService when the countdown completes
//  - When the countdown completes with all six players ready, the lobby should call GameService exactly once
//    (the request itself, the gameId event and closing the lobby sockets are covered by
//    'Lobbyservice makes request to GameService' above)
// Lobby should not start a game when a player backs out
//  - If a player becomes unready during the countdown, GameService should not be called
// Lobby should recover when GameService cannot start the game
//  - When GameService responds with an error status, every lobby client should receive a "game-start-failed" error
//  - When GameService is unreachable, every lobby client should receive a "game-start-failed" error
//  - When the game fails to start, every player's ready state should be reset
//  - After a failed start, players can ready up again and the lobby should call GameService a second time
// Lobby should open for a new group once a match starts
//  - Once the game starts, the match's players should be removed from the lobby
//  - Once the game starts, someone watching the lobby should stay connected
//  - Once the game starts, a new group of players should be able to fill the lobby and start another match
describe('US-6-T-2 game start', () => {
	// Short enough to keep each test quick, long enough that a test can register
	// its listeners (or unready a player) before the countdown fires.
	const COUNTDOWN_MS = 300;

	beforeEach(async () => {
		await startLobbyService({ matchCountdownMs: COUNTDOWN_MS });
	});

	// Fills both teams and readies all six players, which starts the countdown.
	async function startCountdown(prefix: string): Promise<Socket[]> {
		const clients = await createFullLobby(prefix);
		await readyUpAll(clients);
		return clients;
	}

	it('calls GameService exactly once when the countdown completes', async () => {
		const clients = await startCountdown('US-6-T-2-once');
		await nextEvent(clients[0], 'lobby:game-started');
		expect(gameServiceFetch).toHaveBeenCalledTimes(1);
	});

	it('does not call GameService when a player unreadies during the countdown', async () => {
		const clients = await startCountdown('US-6-T-2-unready');
		await emitAndWaitForState(clients[0], 'lobby:set-ready', false);
		await expectNoEvent(clients[0], 'lobby:ready-for-match', COUNTDOWN_MS * 2);
		expect(gameServiceFetch).not.toHaveBeenCalled();
	});

	it('reports game-start-failed to the lobby when GameService responds with an error', async () => {
		gameServiceFetch.mockResolvedValue(gameServiceResponse(500, { message: 'database unavailable' }));
		const clients = await startCountdown('US-6-T-2-error');
		// The observer never readied up, so the error must reach the whole room, not just one socket.
		const error = await nextEvent<{ code: string }>(clients[5], 'lobby:error');
		expect(error.code).toBe('game-start-failed');
	});

	it('reports game-start-failed to the lobby when GameService is unreachable', async () => {
		gameServiceFetch.mockRejectedValue(new Error('connect ECONNREFUSED'));
		const clients = await startCountdown('US-6-T-2-unreachable');
		const error = await nextEvent<{ code: string }>(clients[0], 'lobby:error');
		expect(error.code).toBe('game-start-failed');
	});

	it('resets every player\'s ready state when the game fails to start', async () => {
		gameServiceFetch.mockRejectedValue(new Error('connect ECONNREFUSED'));
		const clients = await startCountdown('US-6-T-2-reset');
		const state = await nextLobbyState(clients[0], (lobby) => lobby.readyCount === 0);
		expect(state.players.every((player) => !player.ready)).toBe(true);
	});

	it('removes the match\'s players from the lobby once the game starts', async () => {
		const observer = await connectUser('US-6-T-2-reset-observer');
		await startCountdown('US-6-T-2-leave');
		const state = await nextLobbyState(observer, (lobby) => lobby.playerCount === 0);
		expect(state.players).toHaveLength(0);
	});

	it('keeps someone watching the lobby connected once the game starts', async () => {
		const observer = await connectUser('US-6-T-2-stay-observer');
		await startCountdown('US-6-T-2-stay');
		await nextLobbyState(observer, (lobby) => lobby.playerCount === 0);
		expect(observer.connected).toBe(true);
	});

	it('lets a new group start another match once the game starts', async () => {
		const first = await startCountdown('US-6-T-2-first');
		await nextEvent(first[0], 'lobby:game-started');
		const second = await startCountdown('US-6-T-2-second');
		await nextEvent(second[0], 'lobby:game-started');
		expect(gameServiceFetch).toHaveBeenCalledTimes(2);
	});

	it('lets players ready up again and calls GameService a second time after a failed start', async () => {
		gameServiceFetch.mockRejectedValueOnce(new Error('connect ECONNREFUSED'));
		const clients = await startCountdown('US-6-T-2-retry');
		await nextLobbyState(clients[0], (lobby) => lobby.readyCount === 0);
		for (const client of clients) await emitAndWaitForState(client, 'lobby:set-ready', true);
		await nextEvent(clients[0], 'lobby:game-started');
		expect(gameServiceFetch).toHaveBeenCalledTimes(2);
	});
});

// US-1-T-2 Server should own each player's ready state
//  - A ready request with a non-boolean value (e.g. "yes") should receive an "invalid-ready-status" error
//  - After a ready request with a non-boolean value, the player should still be not ready
// US-1-T-2 Every ready change should be broadcast to every client in the lobby
//  - In a full 3v3 lobby, when one player readies up, every one of the six clients should see that player as ready
//  - In a full 3v3 lobby, when a readied player un-readies, every one of the six clients should see that player as not ready
//  - In a full 3v3 lobby, after one player readies up, every client should see a ready count of 1
// US-1-T-2 Lobby should be ready to start once every player of the chosen size is ready
//  - In a full 1v1 / 2v2 / 3v3 lobby, once every player readies up, the lobby should report it is ready to start
// US-1-T-2 A readied player cannot switch teams in a full lobby
//  - A readied player who asks to join the other team should receive a "team-full" error
//  - After the rejected team switch, that player should still be ready
// US-1-T-2 Leaving should reset ready state
//  - When a readied player leaves, every remaining player should be not ready
//  - When a readied player leaves, the ready count should be 0
describe('US-1-T-2 ready state sync', () => {
	// Builds a full lobby with `perTeam` players on each team. The first player
	// is the host and shrinks the team size when it is below the default of 3;
	// even indexes go to Team 1 and odd indexes to Team 2.
	async function fullLobbyOfSize(prefix: string, perTeam: number): Promise<Socket[]> {
		const sockets: Socket[] = [];
		for (let seat = 0; seat < perTeam * 2; seat++) {
			const socket = await connectUser(`${prefix}-${seat}`);
			await emitAndWaitForState(socket, 'lobby:join', undefined, (state) => state.playerCount === seat + 1);
			sockets.push(socket);
			if (seat === 0 && perTeam < 3) {
				await emitAndWaitForState(socket, 'lobby:set-team-size', perTeam, (state) => state.teamSize === perTeam);
			}
		}
		for (const [seat, socket] of sockets.entries()) {
			const team: 'a' | 'b' = seat % 2 === 0 ? 'a' : 'b';
			await emitAndWaitForState(socket, 'lobby:join-team', team, (state) => state.players.find((player) => player.userId === `${prefix}-${seat}`)?.team === team);
		}
		return sockets;
	}

	// Readies the given player and resolves once the lobby has `expectedReadyCount` ready players.
	function readyUp(socket: Socket, expectedReadyCount: number): Promise<LobbySnapshot> {
		return emitAndWaitForState(socket, 'lobby:set-ready', true, (state) => state.readyCount === expectedReadyCount);
	}

	// Resolves with the first lobby:state each socket receives that matches `predicate`.
	function stateOnEveryClient(sockets: Socket[], predicate: (_state: LobbySnapshot) => boolean): Promise<LobbySnapshot[]> {
		return Promise.all(sockets.map((socket) => nextLobbyState(socket, predicate)));
	}

	const readyFlagOf = (state: LobbySnapshot, userId: string) => state.players.find((player) => player.userId === userId)?.ready;

	// AC1: only a real boolean can change a ready flag.
	it('US-1-T-2 rejects a non-boolean ready value with invalid-ready-status', async () => {
		const socket = await connectUser('ready-bad-value');
		await emitAndWaitForState(socket, 'lobby:join');
		const error = nextEvent<{ code: string }>(socket, 'lobby:error');
		socket.emit('lobby:set-ready', 'yes');
		expect(await error).toMatchObject({ code: 'invalid-ready-status' });
	});

	// AC1: the rejected request leaves the server-held flag untouched.
	it('US-1-T-2 keeps a player not ready after a non-boolean ready value', async () => {
		const socket = await connectUser('ready-bad-value-state');
		await emitAndWaitForState(socket, 'lobby:join');
		const error = nextEvent(socket, 'lobby:error');
		socket.emit('lobby:set-ready', 'yes');
		await error;
		expect(readyFlagOf(lobbyService.lobby.snapshot(), 'ready-bad-value-state')).toBe(false);
	});

	// AC2: a ready-up reaches all six clients, not just the sender.
	it('US-1-T-2 shows a player who readies up as ready on all six clients', async () => {
		const sockets = await fullLobbyOfSize('ready-broadcast', 3);
		const seen = stateOnEveryClient(sockets, (state) => state.readyCount === 1);
		sockets[0].emit('lobby:set-ready', true);
		const states = await seen;
		expect(states.every((state) => readyFlagOf(state, 'ready-broadcast-0') === true)).toBe(true);
	});

	// AC3: an un-ready reaches all six clients too.
	it('US-1-T-2 shows a player who un-readies as not ready on all six clients', async () => {
		const sockets = await fullLobbyOfSize('unready-broadcast', 3);
		await readyUp(sockets[0], 1);
		const seen = stateOnEveryClient(sockets, (state) => state.readyCount === 0);
		sockets[0].emit('lobby:set-ready', false);
		const states = await seen;
		expect(states.every((state) => readyFlagOf(state, 'unready-broadcast-0') === false)).toBe(true);
	});

	// AC2: the ready count in each broadcast matches the change.
	it('US-1-T-2 shows a ready count of 1 on every client after one player readies up', async () => {
		const sockets = await fullLobbyOfSize('ready-count', 3);
		const seen = stateOnEveryClient(sockets, (state) => readyFlagOf(state, 'ready-count-0') === true);
		sockets[0].emit('lobby:set-ready', true);
		const states = await seen;
		expect(states.every((state) => state.readyCount === 1)).toBe(true);
	});

	// AC4: readiness is measured against the chosen lobby size, not a fixed six.
	it.each([1, 2, 3])('US-1-T-2 reports ready to start once every player in a full lobby of %i per team', async (perTeam) => {
		const sockets = await fullLobbyOfSize(`ready-start-${perTeam}`, perTeam);
		for (const [seat, socket] of sockets.slice(0, -1).entries()) await readyUp(socket, seat + 1);
		const state = await readyUp(sockets[sockets.length - 1], sockets.length);
		expect(state.readyToStart).toBe(true);
	});

	// AC5: a full lobby has no open seat on the other team, so the switch is refused.
	it('US-1-T-2 rejects a readied player switching teams with team-full', async () => {
		const sockets = await fullLobbyOfSize('ready-switch', 3);
		await readyUp(sockets[0], 1);
		const error = nextEvent<{ code: string }>(sockets[0], 'lobby:error');
		sockets[0].emit('lobby:join-team', 'b');
		expect(await error).toMatchObject({ code: 'team-full' });
	});

	// AC5: the refused switch does not touch the player's ready flag.
	it('US-1-T-2 keeps a readied player ready after a rejected team switch', async () => {
		const sockets = await fullLobbyOfSize('ready-switch-state', 3);
		await readyUp(sockets[0], 1);
		const error = nextEvent(sockets[0], 'lobby:error');
		sockets[0].emit('lobby:join-team', 'b');
		await error;
		expect(readyFlagOf(lobbyService.lobby.snapshot(), 'ready-switch-state-0')).toBe(true);
	});

	// AC6: a readied player leaving clears every remaining player's ready flag.
	// Two players ready up first so a remaining player had something to reset.
	it('US-1-T-2 shows every remaining player as not ready after a readied player leaves', async () => {
		const sockets = await fullLobbyOfSize('ready-leave', 3);
		await readyUp(sockets[0], 1);
		await readyUp(sockets[1], 2);
		const state = await emitAndWaitForState(sockets[0], 'lobby:leave', undefined, (lobby) => lobby.playerCount === 5);
		expect(state.players.every((player) => player.ready === false)).toBe(true);
	});

	// AC6: the broadcast's ready count agrees.
	it('US-1-T-2 shows a ready count of 0 after a readied player leaves', async () => {
		const sockets = await fullLobbyOfSize('ready-leave-count', 3);
		await readyUp(sockets[0], 1);
		await readyUp(sockets[1], 2);
		const state = await emitAndWaitForState(sockets[1], 'lobby:leave', undefined, (lobby) => lobby.playerCount === 5);
		expect(state.readyCount).toBe(0);
	});
});
