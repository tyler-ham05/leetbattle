// US-6-T-2: GameService socket should require authentication
//  - Connections without a valid login token should be rejected with "unauthorized"
//  - A logged-in user who is not a player in the game should be rejected with "not-in-game"
//  - A connection for a gameId that does not exist should be rejected with "not-in-game"
// GameService socket should send the game state to a player who joins
//  - The "game:state" event should carry the gameId the player connected to
//  - The game state should list all six players
//  - The game state should list the nine problems in the match pool
//  - The joining player should be shown as connected
//  - The game state should include how many seconds remain in the match
// GameService socket should put each player in their team's room
//  - A player on team a should be in the "game:<gameId>:a" room
//  - A player on team a should not be in the "game:<gameId>:b" room
// GameService socket should keep every player's connection status up to date
//  - When a second player joins, players already connected should receive a game state showing two connected players
//  - When a player's socket drops, the remaining players should receive a game state showing that player as disconnected
// Game should wait for its players before the clock starts
//  - A new game should be waiting for players
//  - (changed by the ban phase) When every player has connected, the game should move to "banning"
//  - (changed by the ban phase) When the join wait runs out, the game should move to "banning" with whoever has connected
// Game should give a dropped player time to reconnect
//  - Right after a player's socket drops, they should not be marked as left
//  - When a player reconnects within the window, they should not be marked as left
//  - When the window runs out, the player should be marked as left
//  - When every player on a team has left, the other team should win by disconnect
// Players should be able to forfeit as a team
//  - When one of two connected teammates forfeits, the game should keep going with one forfeit vote counted
//  - The same player forfeiting twice should count once
//  - When every connected teammate has forfeited, the other team should win by forfeit
// Game should shut down cleanly once it ends
//  - Once the game ends, the players' sockets should be closed
//  - Once the game ends, connecting to it should be rejected with "not-in-game"
//  - Once the game ends, the players should no longer have an active game
// GameService socket should send enough about each problem for the game page to load it
//  - Each problem in the match pool should carry its task_id
//  - Each problem in the match pool should carry the question_id CodeService looks problems up by
//  - Each problem in the match pool should carry its difficulty
// Players should be able to submit a solution through the game
//  - A correct solution should come back from CodeService as "Accepted"
//  - The code should be graded by CodeService using the problem's question_id
//  - Once a solution is accepted, the game state should show that problem as solved for the submitter's team
//  - A wrong solution should not mark the problem as solved
//  - A problem that isn't in the match pool should be rejected with "unknown-problem"
//  - Submitting before the game has started should be rejected with "not-playing"
//  - When CodeService fails, the submission should be rejected with "grading-failed"
// Teams should not be able to spam submissions
//  - While a teammate's submission is being graded, another submission from the same team should be rejected with "team-busy"
//  - While one team's submission is being graded, the other team should still be able to submit
//  - Right after a team's submission is graded, its next submission should be rejected with "cooldown"
//  - Once the cooldown has passed, the team should be able to submit again
// Game should end once a team solves every problem
//  - When a team has solved every problem in the pool, that team should win with reason "solved"
//  - Before "game:ended", the players should get a final game state that counts the last problem's points (US-4-T-7)
//  - Before "game:ended", the players should get a final game state that shows the last problem as solved (US-4-T-7)
// Game should decide the winner when time runs out
//  - When team a has the higher score, team a should win
//  - When team b has the higher score, team b should win
//  - When the scores are level, the game should be a draw
// Game should still finish when saving its end fails
//  - When the database can't save the end of the game, the players should still receive the result
//
// Ban phase: every player bans one of the nine, the rest are played; a ban
// window, and anyone who hasn't banned when it runs out is skipped.
// Game should hold a ban phase before the clock starts
//  - When every player has connected, the game should move to "banning"
//  - When the join wait runs out, the game should move to "banning" with whoever has connected
//  - While banning, the game state should show the full 20 minutes remaining
//  - While banning, the game state should include how many seconds are left to ban
// GameService socket should send each problem's topics for the ban screen
//  - Each problem in the match pool should carry its tags from CodeService as topics
// Players should be able to ban one problem each
//  - When a player bans a problem, the game state should show that problem as banned by that player
//  - The ban should carry the banning player's display name
//  - The ban should carry the banning player's team
//  - When a player bans, the other players should receive a game state showing the ban
//  - A player's second ban should be rejected with "already-banned"
//  - Banning a problem another player already banned should be rejected with "problem-banned"
//  - Banning a problem that isn't in the match pool should be rejected with "unknown-problem"
//  - Banning once play has started should be rejected with "not-banning"
//  - Submitting a solution during the ban phase should be rejected with "not-playing"
// Play should start once the bans are in
//  - When every player has banned, the game should start playing
//  - Once play starts, the match pool should only list the problems that weren't banned
//  - In a 3v3, six bans should leave three problems in play
//  - In a 1v1, two bans should leave seven problems in play
//  - When the ban window runs out, the game should start playing with the bans made so far
//  - When a player has left during the ban phase, the game should start once every remaining player has banned
// Game should give a player who drops during the ban phase time to reconnect
//  - When a player's socket drops during the ban phase, their reconnect window should start
//  - When every player on a team has left during the ban phase, the other team should win by disconnect
// Game should be won on the problems left in play
//  - When a team has solved every problem left after the bans, that team should win with reason "solved"
// Bans should be saved
//  - Once play starts, the game's saved problems (game_problems) should only be the ones left in play
//
// Because a game now bans before it plays, every older test that needs a game
// in play (forfeit, submitting, winning, ending) gets there through
// playingGame(), which has every player ban first. What those tests check is
// unchanged.
import { randomUUID } from 'node:crypto';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { EncryptJWT } from 'jose';
import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import { gameServer, request, socketUrl } from './setup';
import { pool } from '../src/db';
import { pointsForSubmission, resultOnTime } from '../src/server';
import { FAKE_GRADING_MS, fakeCodeServiceFetch, fakeTags, sixReadyPlayers } from './fixtures';
import type { ReadyPlayer } from './fixtures';

// Mirrors the JWE session tokens AuthService issues (see LobbyService's auth
// tests): encrypted with the shared SECRET, carrying the account's id/email.
const SECRET = 'local-test-secret-'.padEnd(64, 'x');
const MATCH_SECONDS = 20 * 60;
// Matches the ban window test/setup.ts gives the server.
const BAN_WINDOW_MS = 1000;
// Matches the pick window test/setup.ts gives the server (US-6-T-10).
const PICK_WINDOW_MS = 1000;

// Who banned a problem, as the ban screen shows it.
interface BannedBy {
	userId: string;
	displayName: string;
	team: 'a' | 'b';
}

// Who picked a problem, as the pick screen shows it (US-6-T-10). Each team
// picks independently, so a problem can have up to one picker per team.
interface PickedBy {
	userId: string;
	displayName: string;
	team: 'a' | 'b';
}

// One problem in the pool. topics are CodeService's tags (all the ban screen
// shows), bannedBy is null until a player bans it, and pickedBy.a / .b are
// null until a player on that team picks it.
interface PoolProblemPayload {
	taskId: string;
	questionId: number;
	difficulty: string;
	topics: string[];
	bannedBy: BannedBy | null;
	pickedBy: Record<'a' | 'b', PickedBy | null>;
}

// The payload GameService sends on `game:state`.
interface GameStatePayload {
	gameId: string;
	phase: 'waiting' | 'banning' | 'picking' | 'playing';
	secondsRemaining: number;
	banSecondsRemaining: number; // seconds left in the ban window
	pickSecondsRemaining: number; // seconds left in the pick window (US-6-T-10)
	problemPool: PoolProblemPayload[];
	solved: Record<'a' | 'b', string[]>; // task_ids each team has solved
	players: { userId: string; team: 'a' | 'b'; connected: boolean; left: boolean }[];
	forfeitVotes: Record<'a' | 'b', number>;
}

// The payload GameService sends on `game:ended`.
interface GameResult {
	winner: 'a' | 'b' | null;
	reason: 'forfeit' | 'disconnect' | 'time' | 'solved';
}

let clients: Socket[] = [];
let players: ReadyPlayer[];
let gameId: string;

async function tokenFor(userId: string): Promise<string> {
	return new EncryptJWT({ id: userId, email: `${userId}@example.test` })
		.setProtectedHeader({ alg: 'dir', enc: 'A256CBC-HS512' })
		.setIssuedAt()
		.setExpirationTime('5m')
		.encrypt(new TextEncoder().encode(SECRET));
}

// Resolves with the next `game:state` that satisfies `predicate`, so a test
// can wait for a specific roster change rather than whichever state arrives first.
function nextState(socket: Socket, predicate: (_state: GameStatePayload) => boolean = () => true): Promise<GameStatePayload> {
	return new Promise((resolve, reject) => {
		const timeout = setTimeout(() => {
			socket.off('game:state', onState);
			reject(new Error('Timed out waiting for the expected game state'));
		}, 2_000);
		const onState = (state: GameStatePayload) => {
			if (!predicate(state)) return;
			clearTimeout(timeout);
			socket.off('game:state', onState);
			resolve(state);
		};
		socket.on('game:state', onState);
	});
}

// Resolves with the next `event` the socket receives.
function nextEvent<T>(socket: Socket, event: string): Promise<T> {
	return new Promise((resolve, reject) => {
		const timeout = setTimeout(() => reject(new Error(`Timed out waiting for ${event}`)), 2_000);
		socket.once(event, (value: T) => {
			clearTimeout(timeout);
			resolve(value);
		});
	});
}

// Creates a fresh game with `teamA` players on team a and `teamB` on team b.
async function newGame(teamA: number, teamB: number): Promise<{ gameId: string; players: ReadyPlayer[] }> {
	const roster = sixReadyPlayers().slice(0, teamA + teamB)
		.map((player, i) => ({ ...player, team: (i < teamA ? 'a' : 'b') as 'a' | 'b' }));
	const res = await request.put('/game').send({ players: roster });
	return { gameId: res.body.gameId, players: roster };
}

// Connects every listed player to the game and resolves once it is playing.
async function joinAll(game: { gameId: string; players: ReadyPlayer[] }): Promise<Socket[]> {
	const sockets: Socket[] = [];
	for (const player of game.players) sockets.push((await joinGame(player.userId, game.gameId)).socket);
	return sockets;
}

// Opens a socket with the given handshake auth but does not connect it yet.
function openSocket(auth: Record<string, unknown>): Socket {
	const client = io(socketUrl(), {
		autoConnect: false,
		reconnection: false,
		transports: ['websocket'],
		auth,
	});
	clients.push(client);
	return client;
}

// Connects with the given auth and resolves with the reason the server refused it.
function connectionError(auth: Record<string, unknown>): Promise<Error> {
	const client = openSocket(auth);
	const error = new Promise<Error>((resolve) => client.once('connect_error', resolve));
	client.connect();
	return error;
}

// Connects `userId` to the game under test and resolves once the server has
// sent them their first `game:state`.
async function joinGame(userId: string, gameIdToJoin = gameId): Promise<{ socket: Socket; state: GameStatePayload }> {
	const socket = openSocket({ token: await tokenFor(userId), gameId: gameIdToJoin });
	const state = nextState(socket);
	socket.connect();
	return { socket, state: await state };
}

// Waits until the server has processed every client disconnect, so one test's
// sockets are out of their rooms before the next test counts room members.
async function waitForServerSockets(count: number): Promise<void> {
	const deadline = Date.now() + 2_000;
	while (gameServer.io.sockets.sockets.size !== count) {
		if (Date.now() > deadline) throw new Error('Timed out waiting for sockets to close');
		await new Promise((resolve) => setTimeout(resolve, 10));
	}
}

// What GameService answers a `game:ban` with: ok, or why the ban was refused.
interface BanResponse {
	ok?: boolean;
	error?: string;
}

// Bans `questionId` for the player on `socket` and resolves with GameService's answer.
function ban(socket: Socket, questionId: number): Promise<BanResponse> {
	return socket.timeout(2_000).emitWithAck('game:ban', { questionId });
}

// What GameService answers a `game:pick` with: ok, or why the pick was refused (US-6-T-10).
interface PickResponse {
	ok?: boolean;
	error?: string;
}

// Picks `questionId` for the player on `socket` and resolves with GameService's answer.
function pick(socket: Socket, questionId: number): Promise<PickResponse> {
	return socket.timeout(2_000).emitWithAck('game:pick', { questionId });
}

// A fresh game with every player connected, resolved once the bans have
// started. Gives back the sockets (in roster order), the first banning state,
// and the pool (sized by team size -- see "pool size by team size" below) as
// it stood when the bans began. teamA/teamB must each be at least 2: a 1v1
// never reaches banning (see "a 1v1 skips banning and picking").
async function banningGame(teamA: number, teamB: number) {
	const game = await newGame(teamA, teamB);
	const first = await joinGame(game.players[0].userId, game.gameId);
	// Listening before the others join, since the last join starts the bans.
	const banning = nextState(first.socket, (state) => state.phase === 'banning');
	const others: Socket[] = [];
	for (const player of game.players.slice(1)) others.push((await joinGame(player.userId, game.gameId)).socket);
	const state = await banning;
	return { game, sockets: [first.socket, ...others], state, pool: state.problemPool };
}

// Has each socket ban a different problem (the i-th socket bans pool[i]) and
// resolves with the first state once picking has started.
async function banEveryone(sockets: Socket[], pool: PoolProblemPayload[]): Promise<GameStatePayload> {
	const picking = nextState(sockets[0], (state) => state.phase === 'picking');
	for (const [i, socket] of sockets.entries()) await ban(socket, pool[i].questionId);
	return picking;
}

// A fully-banned game, resolved once picking has started. Gives back the
// sockets (in roster order) and `remaining`, the problems left to pick from
// (what the bans left) -- one fewer than the pool, times the team size.
async function pickingGame(teamA: number, teamB: number) {
	const { game, sockets, pool } = await banningGame(teamA, teamB);
	const state = await banEveryone(sockets, pool);
	return { game, sockets, remaining: state.problemPool };
}

// Has each socket pick a problem within its own team: the i-th socket on a
// team picks `remaining[i-th within that team]`, since `remaining` has
// exactly one entry per teammate (team size == problems left to pick from).
// Resolves with the first state once the game is playing.
async function pickEveryone(sockets: Socket[], remaining: PoolProblemPayload[]): Promise<GameStatePayload> {
	const playing = nextState(sockets[0], (state) => state.phase === 'playing');
	const teamSize = remaining.length;
	for (const [i, socket] of sockets.entries()) await pick(socket, remaining[i % teamSize].questionId);
	return playing;
}

// A game that is already playing, with every player connected. A 1v1 goes
// straight there on its full pool (it never bans or picks -- US-6-T-10); any
// other size bans, then picks, first. `pool` is the problems actually left
// in play, read back from the server so it's never out of sync with the bans
// or picks this helper made.
async function playingGame(teamA: number, teamB: number) {
	if (teamA === 1 && teamB === 1) {
		const game = await newGame(teamA, teamB);
		const joined = await Promise.all(game.players.map((player) => joinGame(player.userId, game.gameId)));
		// The pool is fixed at game creation, before either player connects, so
		// it's the same regardless of which player's first state we read it from.
		return { game, sockets: joined.map((entry) => entry.socket), pool: joined[0].state.problemPool };
	}
	const { game, sockets, remaining } = await pickingGame(teamA, teamB);
	const state = await pickEveryone(sockets, remaining);
	return { game, sockets, pool: state.problemPool };
}

// The stand-in for CodeService, kept so tests can check what was sent to it.
let codeService: ReturnType<typeof fakeCodeServiceFetch>;

beforeAll(() => {
	process.env.SECRET = SECRET;
	codeService = fakeCodeServiceFetch();
	vi.stubGlobal('fetch', codeService);
});

// A fresh six-player game per test, since the lifecycle tests end theirs.
beforeEach(async () => {
	({ gameId, players } = await newGame(3, 3));
});

afterEach(async () => {
	for (const client of clients) client.disconnect();
	clients = [];
	await waitForServerSockets(0);
});

afterAll(() => {
	vi.unstubAllGlobals();
});

describe('game socket authentication', () => {
	it('rejects a connection without a valid login token', async () => {
		const error = await connectionError({ token: 'invalid-token', gameId });
		expect(error.message).toBe('unauthorized');
	});

	it('rejects a logged-in user who is not a player in the game', async () => {
		const error = await connectionError({ token: await tokenFor(randomUUID()), gameId });
		expect(error.message).toBe('not-in-game');
	});

	it('rejects a connection for a game that does not exist', async () => {
		const error = await connectionError({ token: await tokenFor(players[0].userId), gameId: randomUUID() });
		expect(error.message).toBe('not-in-game');
	});
});

describe('game state on join', () => {
	it('carries the gameId the player connected to', async () => {
		const { state } = await joinGame(players[0].userId);
		expect(state.gameId).toBe(gameId);
	});

	it('lists all six players', async () => {
		const { state } = await joinGame(players[0].userId);
		expect(state.players).toHaveLength(6);
	});

	it('lists the nine problems in the match pool', async () => {
		const { state } = await joinGame(players[0].userId);
		expect(state.problemPool).toHaveLength(9);
	});

	it('shows the joining player as connected', async () => {
		const { state } = await joinGame(players[0].userId);
		expect(state.players.find((player) => player.userId === players[0].userId)?.connected).toBe(true);
	});

	it('includes the seconds remaining in the match', async () => {
		const { state } = await joinGame(players[0].userId);
		// The game was created moments ago, so nearly the whole 20 minutes is left.
		expect(state.secondsRemaining > 0 && state.secondsRemaining <= MATCH_SECONDS).toBe(true);
	});
});

describe('team rooms', () => {
	it('puts a team a player in their team room', async () => {
		await joinGame(players[0].userId);
		const members = await gameServer.io.in(`game:${gameId}:a`).fetchSockets();
		expect(members.map((member) => member.data.user.id)).toEqual([players[0].userId]);
	});

	it('keeps a team a player out of team b\'s room', async () => {
		await joinGame(players[0].userId);
		const members = await gameServer.io.in(`game:${gameId}:b`).fetchSockets();
		expect(members).toHaveLength(0);
	});
});

describe('connection status', () => {
	it('tells connected players when a teammate joins', async () => {
		const first = await joinGame(players[0].userId);
		const twoConnected = nextState(first.socket, (state) => state.players.filter((player) => player.connected).length === 2);
		await joinGame(players[1].userId);
		const state = await twoConnected;
		expect(state.players.filter((player) => player.connected).map((player) => player.userId).sort())
			.toEqual([players[0].userId, players[1].userId].sort());
	});

	it('marks a player disconnected when their socket drops', async () => {
		const first = await joinGame(players[0].userId);
		const second = await joinGame(players[1].userId);
		const dropped = nextState(first.socket, (state) =>
			state.players.some((player) => player.userId === players[1].userId && !player.connected));
		second.socket.disconnect();
		const state = await dropped;
		expect(state.players.find((player) => player.userId === players[1].userId)?.connected).toBe(false);
	});
});

// Matches the join wait and reconnect window test/setup.ts gives the server.
const SETUP_WAIT_MS = 300;
const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('waiting for players', () => {
	it('starts a new game waiting for players', async () => {
		const { state } = await joinGame(players[0].userId);
		expect(state.phase).toBe('waiting');
	});

	// Changed by the ban phase: a full game (above a 1v1 -- see "a 1v1 skips
	// banning and picking") now bans before it plays.
	it('moves to banning once every player has connected', async () => {
		const game = await newGame(2, 2);
		const first = await joinGame(game.players[0].userId, game.gameId);
		const banning = nextState(first.socket, (state) => state.phase === 'banning');
		for (const player of game.players.slice(1)) await joinGame(player.userId, game.gameId);
		expect((await banning).phase).toBe('banning');
	});

	// Changed by the ban phase: the join wait running out starts the bans, not play.
	it('moves to banning with whoever has connected when the join wait runs out', async () => {
		const game = await newGame(2, 2);
		const first = await joinGame(game.players[0].userId, game.gameId);
		const state = await nextState(first.socket, (next) => next.phase === 'banning');
		expect(state.players.filter((player) => player.connected)).toHaveLength(1);
	});
});

// US-6-T-10: a 1v1 has no teammate to ban or pick with, so it skips both
// phases entirely and goes straight to playing on its full, un-banned pool.
describe('a 1v1 skips banning and picking', () => {
	it('moves straight to playing once both players have connected', async () => {
		const game = await newGame(1, 1);
		const first = await joinGame(game.players[0].userId, game.gameId);
		const playing = nextState(first.socket, (state) => state.phase === 'playing');
		await joinGame(game.players[1].userId, game.gameId);
		expect((await playing).phase).toBe('playing');
	});

	it('moves straight to playing with whoever has connected when the join wait runs out', async () => {
		const game = await newGame(1, 1);
		const first = await joinGame(game.players[0].userId, game.gameId);
		const state = await nextState(first.socket, (next) => next.phase === 'playing');
		expect(state.players.filter((player) => player.connected)).toHaveLength(1);
	});

	it('is never shown banning or picking, even briefly', async () => {
		const game = await newGame(1, 1);
		const first = await joinGame(game.players[0].userId, game.gameId);
		const phases: string[] = [first.state.phase];
		first.socket.on('game:state', (state: GameStatePayload) => phases.push(state.phase));
		await joinGame(game.players[1].userId, game.gameId);
		await pause(SETUP_WAIT_MS);
		expect(phases.some((phase) => phase === 'banning' || phase === 'picking')).toBe(false);
	});

	it('has all three of its problems in the pool', async () => {
		const game = await newGame(1, 1);
		const { state } = await joinGame(game.players[0].userId, game.gameId);
		expect(state.problemPool).toHaveLength(3);
	});

	it('never bans or picks any of its problems', async () => {
		const game = await newGame(1, 1);
		await joinGame(game.players[0].userId, game.gameId);
		const { state } = await joinGame(game.players[1].userId, game.gameId);
		expect(state.problemPool.every((problem) => !problem.bannedBy && !problem.pickedBy.a && !problem.pickedBy.b)).toBe(true);
	});
});

describe('reconnect window', () => {
	it('does not mark a player as left right after their socket drops', async () => {
		const first = await joinGame(players[0].userId);
		const second = await joinGame(players[1].userId);
		const dropped = nextState(first.socket, (state) => state.players.some((player) => player.userId === players[1].userId && !player.connected));
		second.socket.disconnect();
		const state = await dropped;
		expect(state.players.find((player) => player.userId === players[1].userId)?.left).toBe(false);
	});

	it('does not mark a player who reconnects in time as left', async () => {
		// Everyone connects, so no one else's window runs out during the pause.
		const game = await newGame(2, 2);
		const [first, second, third] = await joinAll(game);
		const reconnecting = game.players[1].userId;
		second.disconnect();
		await joinGame(reconnecting, game.gameId);
		await pause(SETUP_WAIT_MS * 2);
		// Another player dropping brings a fresh state with everyone's status.
		const update = nextState(first, (state) => state.players.some((player) => player.userId === game.players[2].userId && !player.connected));
		third.disconnect();
		const state = await update;
		expect(state.players.find((player) => player.userId === reconnecting)?.left).toBe(false);
	});

	it('marks a player as left when the window runs out', async () => {
		const first = await joinGame(players[0].userId);
		const second = await joinGame(players[1].userId);
		const left = nextState(first.socket, (state) => state.players.some((player) => player.userId === players[1].userId && player.left));
		second.socket.disconnect();
		const state = await left;
		expect(state.players.find((player) => player.userId === players[1].userId)?.left).toBe(true);
	});

	it('gives the other team the win by disconnect when a whole team has left', async () => {
		const { sockets: [teamA, teamB] } = await playingGame(1, 1);
		const ended = nextEvent<GameResult>(teamA, 'game:ended');
		teamB.disconnect();
		expect(await ended).toEqual({ winner: 'a', reason: 'disconnect' });
	});
});

describe('forfeit', () => {
	it('keeps going with one vote counted when one of two teammates forfeits', async () => {
		const { sockets: [first] } = await playingGame(2, 2);
		const voted = nextState(first, (state) => state.forfeitVotes.a === 1);
		first.emit('game:forfeit');
		const state = await voted;
		expect({ phase: state.phase, votes: state.forfeitVotes.a }).toEqual({ phase: 'playing', votes: 1 });
	});

	it('counts the same player forfeiting twice once', async () => {
		const { sockets: [first] } = await playingGame(2, 2);
		const firstVote = nextState(first, (state) => state.forfeitVotes.a === 1);
		first.emit('game:forfeit');
		await firstVote;
		const secondVote = nextState(first);
		first.emit('game:forfeit');
		expect((await secondVote).forfeitVotes.a).toBe(1);
	});

	it('gives the other team the win by forfeit once every connected teammate has forfeited', async () => {
		const { sockets: [first, second, otherTeam] } = await playingGame(2, 2);
		const ended = nextEvent<GameResult>(otherTeam, 'game:ended');
		first.emit('game:forfeit');
		second.emit('game:forfeit');
		expect(await ended).toEqual({ winner: 'b', reason: 'forfeit' });
	});
});

describe('after the game ends', () => {
	// A 1v1 that team a forfeits straight away.
	async function forfeitedGame() {
		const { game, sockets } = await playingGame(1, 1);
		const ended = nextEvent<GameResult>(sockets[1], 'game:ended');
		sockets[0].emit('game:forfeit');
		await ended;
		return { game, sockets };
	}

	it('closes the players\' sockets', async () => {
		const { sockets } = await forfeitedGame();
		await pause(50);
		expect(sockets.some((socket) => socket.connected)).toBe(false);
	});

	it('rejects connecting to it with "not-in-game"', async () => {
		const { game } = await forfeitedGame();
		const error = await connectionError({ token: await tokenFor(game.players[0].userId), gameId: game.gameId });
		expect(error.message).toBe('not-in-game');
	});

	it('leaves the players with no active game', async () => {
		const { game } = await forfeitedGame();
		// US-6-T-8: the endpoint now needs the player's own login token.
		const res = await request.get(`/game/${game.players[0].userId}`).set('Authorization', `Bearer ${await tokenFor(game.players[0].userId)}`);
		expect(res.status).toBe(404);
	});
});

// The game page lists the pool from `game:state` alone, then loads a problem's
// full details from CodeService's GET /problem/:questionId - so each entry has
// to carry the question_id, not just the task_id saved in game_problems.
// fakeCodeServiceFetch (test/fixtures.ts) numbers its problems' question_ids
// from 1 and labels each with the difficulty that was asked for.
describe('problem details in the game state', () => {
	it('gives each problem in the pool its task_id', async () => {
		const { state } = await joinGame(players[0].userId);
		// Every one of the nine entries has a task_id string.
		expect(state.problemPool.filter((problem) => typeof problem.taskId === 'string')).toHaveLength(9);
	});

	it('gives each problem in the pool the question_id CodeService looks it up by', async () => {
		const { state } = await joinGame(players[0].userId);
		// Every one of the nine entries has a numeric question_id.
		expect(state.problemPool.filter((problem) => typeof problem.questionId === 'number')).toHaveLength(9);
	});

	it('gives each problem in the pool its difficulty', async () => {
		const { state } = await joinGame(players[0].userId);
		// The pool is 6 Easy + 3 Medium, so the difficulties show up in that order.
		expect(state.problemPool.map((problem) => problem.difficulty)).toEqual([
			'Easy', 'Easy', 'Easy', 'Easy', 'Easy', 'Easy', 'Medium', 'Medium', 'Medium',
		]);
	});
});

// What GameService answers a `game:submit` with: CodeService's grading, or
// the reason the submission was refused before it reached CodeService.
interface SubmitResponse {
	verdict?: string;
	error?: string;
}

// Sends a solution for `questionId` and resolves with GameService's answer.
// The fake CodeService (test/fixtures.ts) accepts the code "correct", fails
// on "crash", and calls anything else a wrong answer.
function submit(socket: Socket, questionId: number, code: string): Promise<SubmitResponse> {
	return socket.timeout(2_000).emitWithAck('game:submit', { questionId, code });
}

// Long enough for the test server's 100 ms submit cooldown (test/setup.ts) to pass.
const AFTER_COOLDOWN_MS = 150;

describe('submitting a solution', () => {
	it('returns CodeService\'s "Accepted" for a correct solution', async () => {
		const { sockets, pool } = await playingGame(1, 1);
		const response = await submit(sockets[0], pool[0].questionId, 'correct');
		expect(response.verdict).toBe('Accepted');
	});

	it('has CodeService grade the code by the problem\'s question_id', async () => {
		const { sockets, pool } = await playingGame(1, 1);
		await submit(sockets[0], pool[0].questionId, 'correct');
		expect(codeService).toHaveBeenCalledWith(`http://localhost:4001/solution/${pool[0].questionId}`, expect.anything());
	});

	it('shows an accepted problem as solved for the submitter\'s team', async () => {
		const { sockets, pool } = await playingGame(1, 1);
		const solved = nextState(sockets[1], (state) => state.solved.a.length > 0);
		await submit(sockets[0], pool[0].questionId, 'correct');
		expect((await solved).solved.a).toEqual([pool[0].taskId]);
	});

	it('does not mark a problem solved for a wrong solution', async () => {
		const { sockets, pool } = await playingGame(1, 1);
		// GameService sends a fresh state once each submission is graded.
		const graded = nextState(sockets[1]);
		await submit(sockets[0], pool[0].questionId, 'wrong');
		expect((await graded).solved.a).toEqual([]);
	});

	it('rejects a problem that isn\'t in the match pool with "unknown-problem"', async () => {
		const { sockets } = await playingGame(1, 1);
		const response = await submit(sockets[0], -1, 'correct');
		expect(response.error).toBe('unknown-problem');
	});

	it('rejects a submission before the game has started with "not-playing"', async () => {
		// Only one of the two players connects, so the game is still waiting.
		const game = await newGame(1, 1);
		const { socket, state } = await joinGame(game.players[0].userId, game.gameId);
		const response = await submit(socket, state.problemPool[0].questionId, 'correct');
		expect(response.error).toBe('not-playing');
	});

	it('rejects the submission with "grading-failed" when CodeService fails', async () => {
		const { sockets, pool } = await playingGame(1, 1);
		const response = await submit(sockets[0], pool[0].questionId, 'crash');
		expect(response.error).toBe('grading-failed');
	});
});

describe('submission lock and cooldown', () => {
	it('rejects a teammate\'s submission with "team-busy" while one is being graded', async () => {
		const { sockets, pool } = await playingGame(2, 2);
		const first = submit(sockets[0], pool[0].questionId, 'wrong');
		// Well inside the fake CodeService's grading time.
		await pause(FAKE_GRADING_MS / 5);
		const second = await submit(sockets[1], pool[1].questionId, 'wrong');
		await first;
		expect(second.error).toBe('team-busy');
	});

	it('still lets the other team submit while one team\'s submission is being graded', async () => {
		const { sockets, pool } = await playingGame(2, 2);
		const teamA = submit(sockets[0], pool[0].questionId, 'wrong');
		await pause(FAKE_GRADING_MS / 5);
		// sockets[2] is the first player on team b.
		const teamB = await submit(sockets[2], pool[0].questionId, 'wrong');
		await teamA;
		expect(teamB.verdict).toBe('Wrong Answer');
	});

	it('rejects a team\'s next submission with "cooldown" right after one is graded', async () => {
		const { sockets, pool } = await playingGame(1, 1);
		await submit(sockets[0], pool[0].questionId, 'wrong');
		const response = await submit(sockets[0], pool[0].questionId, 'wrong');
		expect(response.error).toBe('cooldown');
	});

	it('lets the team submit again once the cooldown has passed', async () => {
		const { sockets, pool } = await playingGame(1, 1);
		await submit(sockets[0], pool[0].questionId, 'wrong');
		await pause(AFTER_COOLDOWN_MS);
		const response = await submit(sockets[0], pool[0].questionId, 'wrong');
		expect(response.verdict).toBe('Wrong Answer');
	});
});

describe('winning by solving every problem', () => {
	// Also covers the ban phase's "When a team has solved every problem left
	// after the bans, that team should win with reason "solved"": playingGame's
	// pool is the seven problems the 1v1's two bans left, and solving just those
	// seven has to be enough.
	it('gives the win to the team that solves every problem, with reason "solved"', async () => {
		const { sockets, pool } = await playingGame(1, 1);
		// Team a solves all but the last problem, waiting out the cooldown each time.
		for (const problem of pool.slice(0, -1)) {
			await submit(sockets[0], problem.questionId, 'correct');
			await pause(AFTER_COOLDOWN_MS);
		}
		const ended = nextEvent<GameResult>(sockets[1], 'game:ended');
		await submit(sockets[0], pool[pool.length - 1].questionId, 'correct');
		expect(await ended).toEqual({ winner: 'a', reason: 'solved' });
	});

	// US-4-T-7 bug: solving the last problem ended the game before the new
	// state went out, so players kept the score from before that solve and
	// the result screen was short the last problem's points. Solves all but
	// the last problem, then returns the last game state the other player had
	// before the game ended and the score from before the last solve.
	async function finalStateAfterSolvingEverything() {
		const { sockets, pool } = await playingGame(1, 1);
		// Keeps the newest game state the other player has received.
		let latest: GameStatePayload | null = null;
		sockets[1].on('game:state', (state: GameStatePayload) => {
			latest = state;
		});
		for (const problem of pool.slice(0, -1)) {
			await submit(sockets[0], problem.questionId, 'correct');
			await pause(AFTER_COOLDOWN_MS);
		}
		const scoreBefore = (latest as GameStatePayload | null)?.scores.a ?? 0;
		const ended = nextEvent<GameResult>(sockets[1], 'game:ended');
		await submit(sockets[0], pool[pool.length - 1].questionId, 'correct');
		await ended;
		return { final: latest as unknown as GameStatePayload, scoreBefore, lastTaskId: pool[pool.length - 1].taskId };
	}

	it('US-4-T-7 sends a final game state with the last problem\'s points before the game ends', async () => {
		const { final, scoreBefore } = await finalStateAfterSolvingEverything();
		expect(final.scores.a).toBeGreaterThan(scoreBefore);
	});

	it('US-4-T-7 sends a final game state that shows the last problem as solved before the game ends', async () => {
		const { final, lastTaskId } = await finalStateAfterSolvingEverything();
		expect(final.solved.a).toContain(lastTaskId);
	});
});

// The 20-minute clock can't be shortened per test (every test shares one
// server), so the time-out rule is tested directly.
describe('result when time runs out', () => {
	it('gives the win to team a when it has the higher score', () => {
		expect(resultOnTime({ a: 3, b: 1 })).toEqual({ winner: 'a', reason: 'time' });
	});

	it('gives the win to team b when it has the higher score', () => {
		expect(resultOnTime({ a: 0, b: 2 })).toEqual({ winner: 'b', reason: 'time' });
	});

	it('calls a draw when the scores are level', () => {
		expect(resultOnTime({ a: 1, b: 1 })).toEqual({ winner: null, reason: 'time' });
	});
});

describe('when saving the end of the game fails', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('still sends the players the result', async () => {
		const { sockets: [teamA, teamB] } = await playingGame(1, 1);
		// Only the end-of-game UPDATE fails; every other query runs as normal.
		const query = pool.query.bind(pool);
		vi.spyOn(pool, 'query').mockImplementation(((text: unknown, ...rest: unknown[]) => (
			typeof text === 'string' && text.startsWith('UPDATE game SET ended_at')
				? Promise.reject(new Error('connection lost'))
				: (query as (..._args: unknown[]) => unknown)(text, ...rest)
		)) as typeof pool.query);
		const ended = nextEvent<GameResult>(teamB, 'game:ended');
		teamA.emit('game:forfeit');
		expect(await ended).toEqual({ winner: 'b', reason: 'forfeit' });
	});
});

// ---------------------------------------------------------------------------
// Ban and pick phases. Between connecting and playing, every player (above a
// 1v1 -- see "a 1v1 skips banning and picking") bans one of the pool's
// problems, then picks one of the problems the bans left; the match is
// played on the picks. The pool is sized by team size (US-6-T-10): 2*teamSize
// Easy + teamSize Medium. The ban and pick windows in test/setup.ts are both
// BAN_WINDOW_MS / PICK_WINDOW_MS, longer than the 300 ms reconnect window.
// ---------------------------------------------------------------------------

describe('pool size by team size', () => {
	it('gives a 3v3 six Easy problems', async () => {
		const game = await newGame(3, 3);
		const { state } = await joinGame(game.players[0].userId, game.gameId);
		expect(state.problemPool.filter((problem) => problem.difficulty === 'Easy')).toHaveLength(6);
	});

	it('gives a 3v3 three Medium problems', async () => {
		const game = await newGame(3, 3);
		const { state } = await joinGame(game.players[0].userId, game.gameId);
		expect(state.problemPool.filter((problem) => problem.difficulty === 'Medium')).toHaveLength(3);
	});

	it('gives a 2v2 four Easy problems', async () => {
		const game = await newGame(2, 2);
		const { state } = await joinGame(game.players[0].userId, game.gameId);
		expect(state.problemPool.filter((problem) => problem.difficulty === 'Easy')).toHaveLength(4);
	});

	it('gives a 2v2 two Medium problems', async () => {
		const game = await newGame(2, 2);
		const { state } = await joinGame(game.players[0].userId, game.gameId);
		expect(state.problemPool.filter((problem) => problem.difficulty === 'Medium')).toHaveLength(2);
	});

	it('gives a 1v1 two Easy problems', async () => {
		const game = await newGame(1, 1);
		const { state } = await joinGame(game.players[0].userId, game.gameId);
		expect(state.problemPool.filter((problem) => problem.difficulty === 'Easy')).toHaveLength(2);
	});

	it('gives a 1v1 one Medium problem', async () => {
		const game = await newGame(1, 1);
		const { state } = await joinGame(game.players[0].userId, game.gameId);
		expect(state.problemPool.filter((problem) => problem.difficulty === 'Medium')).toHaveLength(1);
	});
});

describe('ban phase before the clock starts', () => {
	it('shows the full 20 minutes remaining while banning', async () => {
		const { state } = await banningGame(2, 2);
		// The match clock only starts once the bans (and picks) are in.
		expect(state.secondsRemaining).toBe(MATCH_SECONDS);
	});

	it('includes how many seconds are left to ban', async () => {
		const { state } = await banningGame(2, 2);
		// The bans began moments ago, so (nearly) the whole window is left.
		expect(state.banSecondsRemaining > 0 && state.banSecondsRemaining <= BAN_WINDOW_MS / 1000).toBe(true);
	});
});

describe('problem topics for the ban screen', () => {
	it('gives each problem in the pool its tags from CodeService as topics', async () => {
		const { state } = await joinGame(players[0].userId);
		// The fake CodeService tags each problem by its question_id (fakeTags).
		expect(state.problemPool.map((problem) => problem.topics))
			.toEqual(state.problemPool.map((problem) => fakeTags(problem.questionId)));
	});
});

describe('banning a problem', () => {
	it('shows the problem as banned by the player who banned it', async () => {
		const { game, sockets, pool } = await banningGame(2, 2);
		const banned = nextState(sockets[0], (state) => state.problemPool.some((problem) => problem.bannedBy));
		await ban(sockets[0], pool[0].questionId);
		const state = await banned;
		expect(state.problemPool.find((problem) => problem.questionId === pool[0].questionId)?.bannedBy?.userId)
			.toBe(game.players[0].userId);
	});

	it('gives the ban the banning player\'s display name', async () => {
		const { sockets, pool } = await banningGame(2, 2);
		const banned = nextState(sockets[0], (state) => state.problemPool.some((problem) => problem.bannedBy));
		await ban(sockets[0], pool[0].questionId);
		const state = await banned;
		// The fixtures name the first player "player-0".
		expect(state.problemPool.find((problem) => problem.questionId === pool[0].questionId)?.bannedBy?.displayName)
			.toBe('player-0');
	});

	it('gives the ban the banning player\'s team', async () => {
		const { sockets, pool } = await banningGame(2, 2);
		const banned = nextState(sockets[0], (state) => state.problemPool.some((problem) => problem.bannedBy));
		await ban(sockets[0], pool[0].questionId);
		const state = await banned;
		// sockets[0] is a team a player.
		expect(state.problemPool.find((problem) => problem.questionId === pool[0].questionId)?.bannedBy?.team)
			.toBe('a');
	});

	it('tells the other players about the ban', async () => {
		const { game, sockets, pool } = await banningGame(2, 2);
		// Listening on another player's socket, not the banner's.
		const seen = nextState(sockets[1], (state) => state.problemPool.some((problem) => problem.bannedBy));
		await ban(sockets[0], pool[0].questionId);
		const state = await seen;
		expect(state.problemPool.find((problem) => problem.questionId === pool[0].questionId)?.bannedBy?.userId)
			.toBe(game.players[0].userId);
	});

	it('rejects a player\'s second ban with "already-banned"', async () => {
		const { sockets, pool } = await banningGame(2, 2);
		await ban(sockets[0], pool[0].questionId);
		// The other players haven't banned yet, so the bans are still going on.
		const response = await ban(sockets[0], pool[1].questionId);
		expect(response.error).toBe('already-banned');
	});

	it('rejects banning a problem another player already banned with "problem-banned"', async () => {
		const { sockets, pool } = await banningGame(2, 2);
		await ban(sockets[0], pool[0].questionId);
		// Bans are match-wide unique, even between players on different teams.
		const response = await ban(sockets[2], pool[0].questionId);
		expect(response.error).toBe('problem-banned');
	});

	it('rejects banning a problem that isn\'t in the match pool with "unknown-problem"', async () => {
		const { sockets } = await banningGame(2, 2);
		const response = await ban(sockets[0], -1);
		expect(response.error).toBe('unknown-problem');
	});

	it('rejects a ban once play has started with "not-banning"', async () => {
		const { sockets, pool } = await playingGame(2, 2);
		const response = await ban(sockets[0], pool[0].questionId);
		expect(response.error).toBe('not-banning');
	});

	it('rejects a submission during the ban phase with "not-playing"', async () => {
		const { sockets, pool } = await banningGame(2, 2);
		const response = await submit(sockets[0], pool[0].questionId, 'correct');
		expect(response.error).toBe('not-playing');
	});
});

describe('starting picking once the bans are in', () => {
	it('starts picking once every player has banned', async () => {
		const { sockets, pool } = await banningGame(2, 2);
		const state = await banEveryone(sockets, pool);
		expect(state.phase).toBe('picking');
	});

	it('lists only the problems that weren\'t banned once picking starts', async () => {
		const { sockets, pool } = await banningGame(2, 2);
		const state = await banEveryone(sockets, pool);
		// banEveryone bans pool[0] to pool[3] (one per player); the other two are left.
		expect(state.problemPool.map((problem) => problem.questionId))
			.toEqual(pool.slice(4).map((problem) => problem.questionId));
	});

	it('leaves three problems to pick from after a 3v3\'s six bans', async () => {
		const { sockets, pool } = await banningGame(3, 3);
		const state = await banEveryone(sockets, pool);
		expect(state.problemPool).toHaveLength(3);
	});

	it('leaves two problems to pick from after a 2v2\'s four bans', async () => {
		const { sockets, pool } = await banningGame(2, 2);
		const state = await banEveryone(sockets, pool);
		expect(state.problemPool).toHaveLength(2);
	});

	it('starts picking with the bans made so far when the ban window runs out', async () => {
		const { sockets, pool } = await banningGame(2, 2);
		// Only one of the four players bans; the rest are skipped.
		await ban(sockets[0], pool[0].questionId);
		const state = await nextState(sockets[0], (next) => next.phase === 'picking');
		expect(state.problemPool).toHaveLength(5);
	});

	it('starts once every remaining player has banned when a player has left', async () => {
		const { game, sockets, pool } = await banningGame(2, 2);
		const leaving = game.players[3].userId;
		// sockets[3] (team b) drops and stays gone until marked as left.
		const left = nextState(sockets[0], (state) => state.players.some((player) => player.userId === leaving && player.left));
		sockets[3].disconnect();
		await left;
		const bansStarted = Date.now();
		await banEveryone(sockets.slice(0, 3), pool);
		// Picking starts on the last remaining ban, well before the ban window
		// would have run out - not because the window ran out.
		expect(Date.now() - bansStarted < BAN_WINDOW_MS / 2).toBe(true);
	});
});

describe('picking a problem', () => {
	it('shows the problem as picked by the player who picked it', async () => {
		const { game, sockets, remaining } = await pickingGame(2, 2);
		const picked = nextState(sockets[0], (state) => state.problemPool.some((problem) => problem.pickedBy.a));
		await pick(sockets[0], remaining[0].questionId);
		const state = await picked;
		expect(state.problemPool.find((problem) => problem.questionId === remaining[0].questionId)?.pickedBy.a?.userId)
			.toBe(game.players[0].userId);
	});

	it('gives the pick the picking player\'s display name', async () => {
		const { sockets, remaining } = await pickingGame(2, 2);
		const picked = nextState(sockets[0], (state) => state.problemPool.some((problem) => problem.pickedBy.a));
		await pick(sockets[0], remaining[0].questionId);
		const state = await picked;
		// The fixtures name the first player "player-0".
		expect(state.problemPool.find((problem) => problem.questionId === remaining[0].questionId)?.pickedBy.a?.displayName)
			.toBe('player-0');
	});

	it('does not let a player pick a problem a teammate already picked', async () => {
		const { sockets, remaining } = await pickingGame(2, 2);
		await pick(sockets[0], remaining[0].questionId);
		// sockets[1] is sockets[0]'s teammate (both team a).
		const response = await pick(sockets[1], remaining[0].questionId);
		expect(response.error).toBe('problem-picked');
	});

	it('lets a player on the other team independently pick the same problem', async () => {
		const { sockets, remaining } = await pickingGame(2, 2);
		await pick(sockets[0], remaining[0].questionId);
		// sockets[2] is on team b, which picks independently of team a's picks.
		const response = await pick(sockets[2], remaining[0].questionId);
		expect(response.ok).toBe(true);
	});

	it('rejects a player\'s second pick with "already-picked"', async () => {
		const { sockets, remaining } = await pickingGame(2, 2);
		await pick(sockets[0], remaining[0].questionId);
		// The other players haven't picked yet, so the picks are still going on.
		const response = await pick(sockets[0], remaining[1].questionId);
		expect(response.error).toBe('already-picked');
	});

	it('rejects picking a problem that isn\'t in the match pool with "unknown-problem"', async () => {
		const { sockets } = await pickingGame(2, 2);
		const response = await pick(sockets[0], -1);
		expect(response.error).toBe('unknown-problem');
	});

	it('rejects a pick once play has started with "not-picking"', async () => {
		const { sockets, pool } = await playingGame(2, 2);
		const response = await pick(sockets[0], pool[0].questionId);
		expect(response.error).toBe('not-picking');
	});
});

describe('starting play once the picks are in', () => {
	it('starts playing once every player has picked', async () => {
		const { sockets, remaining } = await pickingGame(2, 2);
		const state = await pickEveryone(sockets, remaining);
		expect(state.phase).toBe('playing');
	});

	it('auto-assigns whoever hasn\'t picked when the pick window runs out', async () => {
		const { game, sockets, remaining } = await pickingGame(2, 2);
		// Only the first player on each team picks remaining[0]; their
		// teammates (sockets[1] and sockets[3]) are left to be auto-assigned
		// the only problem their own team hasn't picked, remaining[1].
		await pick(sockets[0], remaining[0].questionId);
		await pick(sockets[2], remaining[0].questionId);
		const state = await nextState(sockets[0], (next) => next.phase === 'playing');
		const other = state.problemPool.find((problem) => problem.questionId === remaining[1].questionId);
		expect([other?.pickedBy.a?.userId, other?.pickedBy.b?.userId])
			.toEqual([game.players[1].userId, game.players[3].userId]);
	});

	it('starts once every remaining player has picked when a player has left', async () => {
		const { game, sockets, remaining } = await pickingGame(2, 2);
		const leaving = game.players[3].userId;
		// sockets[3] (team b) drops and stays gone until marked as left.
		const left = nextState(sockets[0], (state) => state.players.some((player) => player.userId === leaving && player.left));
		sockets[3].disconnect();
		await left;
		const picksStarted = Date.now();
		await pickEveryone(sockets.slice(0, 3), remaining);
		// Play starts on the last remaining pick, well before the pick window
		// would have run out - not because the window ran out.
		expect(Date.now() - picksStarted < PICK_WINDOW_MS / 2).toBe(true);
	});
});

describe('reconnect window during the ban phase', () => {
	it('starts a dropped player\'s reconnect window during the ban phase', async () => {
		const { game, sockets } = await banningGame(2, 2);
		const dropping = game.players[1].userId;
		const left = nextState(sockets[0], (state) => state.players.some((player) => player.userId === dropping && player.left));
		sockets[1].disconnect();
		// The reconnect window (300 ms) is shorter than the ban window, so the
		// player is marked as left while the bans are still going on.
		expect((await left).phase).toBe('banning');
	});

	it('gives the other team the win by disconnect when a whole team leaves during the ban phase', async () => {
		const { sockets } = await banningGame(2, 2);
		const ended = nextEvent<GameResult>(sockets[0], 'game:ended');
		const dropped = Date.now();
		// sockets[2] and sockets[3] are team b's whole roster.
		sockets[2].disconnect();
		sockets[3].disconnect();
		const result = await ended;
		// Decided during the bans, not after the ban window ran out and play began.
		expect({ result, duringBans: Date.now() - dropped < BAN_WINDOW_MS })
			.toEqual({ result: { winner: 'a', reason: 'disconnect' }, duringBans: true });
	});
});

describe('reconnect window during the pick phase', () => {
	it('starts a dropped player\'s reconnect window during the pick phase', async () => {
		const { game, sockets } = await pickingGame(2, 2);
		const dropping = game.players[1].userId;
		const left = nextState(sockets[0], (state) => state.players.some((player) => player.userId === dropping && player.left));
		sockets[1].disconnect();
		// The reconnect window (300 ms) is shorter than the pick window, so the
		// player is marked as left while the picks are still going on.
		expect((await left).phase).toBe('picking');
	});

	it('gives the other team the win by disconnect when a whole team leaves during the pick phase', async () => {
		const { sockets } = await pickingGame(2, 2);
		const ended = nextEvent<GameResult>(sockets[0], 'game:ended');
		const dropped = Date.now();
		// sockets[2] and sockets[3] are team b's whole roster.
		sockets[2].disconnect();
		sockets[3].disconnect();
		const result = await ended;
		// Decided during the picks, not after the pick window ran out and play began.
		expect({ result, duringPicks: Date.now() - dropped < PICK_WINDOW_MS })
			.toEqual({ result: { winner: 'a', reason: 'disconnect' }, duringPicks: true });
	});
});

describe('saving the bans', () => {
	it('saves only the problems left in play once play starts', async () => {
		const { game } = await playingGame(2, 2);
		const saved = await pool.query('SELECT task_id FROM game_problems WHERE game_id = $1', [game.gameId]);
		// Six problems, four banned.
		expect(saved.rows).toHaveLength(2);
	});
});

// ---------------------------------------------------------------------------
// US-2-T-2 (#48): Players' code should reach only their own team
//  - When a player sends their code, a teammate should receive it with the player's userId
//  - The teammate should receive the question id and the workspace that was sent
//  - A player on the other team should never receive it
//  - The player who sent it should not receive it back
//  - Code sent before play has started should not be relayed
//  - Code for a question that isn't in the match pool should not be relayed
//  - A malformed workspace should not be relayed
//
// A player sends their whole editor workspace for one question on
// `game:code`; GameService passes it on to their own team room only, so the
// other team can never receive it (enforced on the server, not the UI).
// ---------------------------------------------------------------------------

// One player's editor for one question: their tabs and which one is open.
const WORKSPACE = { tabs: [{ id: 'tab-1', name: 'Tab 1', code: 'def solve():\n    return 1' }], activeTabId: 'tab-1' };

// What GameService relays on `game:code`.
interface CodePayload {
	userId: string;
	displayName: string;
	questionId: number;
	workspace: typeof WORKSPACE;
}

// Long enough for a relay that was going to arrive to have arrived.
const RELAY_WAIT_MS = 100;

// Records every `game:code` the socket receives, so a test can check that
// nothing arrived.
function recordCode(socket: Socket): CodePayload[] {
	const received: CodePayload[] = [];
	socket.on('game:code', (payload: CodePayload) => received.push(payload));
	return received;
}

describe('relaying code to teammates', () => {
	// In a 2v2 the sockets are [team a, team a, team b, team b].
	it('gives a teammate the sending player\'s userId', async () => {
		const { game, sockets, pool } = await playingGame(2, 2);
		const relayed = nextEvent<CodePayload>(sockets[1], 'game:code');
		sockets[0].emit('game:code', { questionId: pool[0].questionId, workspace: WORKSPACE });
		expect((await relayed).userId).toBe(game.players[0].userId);
	});

	it('gives a teammate the question id and the workspace that was sent', async () => {
		const { sockets, pool } = await playingGame(2, 2);
		const relayed = nextEvent<CodePayload>(sockets[1], 'game:code');
		sockets[0].emit('game:code', { questionId: pool[0].questionId, workspace: WORKSPACE });
		const payload = await relayed;
		expect({ questionId: payload.questionId, workspace: payload.workspace })
			.toEqual({ questionId: pool[0].questionId, workspace: WORKSPACE });
	});

	it('never sends the code to the other team', async () => {
		const { sockets, pool } = await playingGame(2, 2);
		const otherTeam = recordCode(sockets[2]);
		// Wait for the teammate's copy, so the relay has definitely happened.
		const relayed = nextEvent<CodePayload>(sockets[1], 'game:code');
		sockets[0].emit('game:code', { questionId: pool[0].questionId, workspace: WORKSPACE });
		await relayed;
		await pause(RELAY_WAIT_MS);
		expect(otherTeam).toEqual([]);
	});

	it('does not send the code back to the player who sent it', async () => {
		const { sockets, pool } = await playingGame(2, 2);
		const sender = recordCode(sockets[0]);
		const relayed = nextEvent<CodePayload>(sockets[1], 'game:code');
		sockets[0].emit('game:code', { questionId: pool[0].questionId, workspace: WORKSPACE });
		await relayed;
		await pause(RELAY_WAIT_MS);
		expect(sender).toEqual([]);
	});

	it('does not relay code sent before play has started', async () => {
		const { sockets, pool } = await banningGame(2, 2);
		const teammate = recordCode(sockets[1]);
		sockets[0].emit('game:code', { questionId: pool[0].questionId, workspace: WORKSPACE });
		await pause(RELAY_WAIT_MS);
		expect(teammate).toEqual([]);
	});

	it('does not relay code for a question that isn\'t in the match pool', async () => {
		const { sockets } = await playingGame(2, 2);
		const teammate = recordCode(sockets[1]);
		sockets[0].emit('game:code', { questionId: -1, workspace: WORKSPACE });
		await pause(RELAY_WAIT_MS);
		expect(teammate).toEqual([]);
	});

	it('does not relay a malformed workspace', async () => {
		const { sockets, pool } = await playingGame(2, 2);
		const teammate = recordCode(sockets[1]);
		sockets[0].emit('game:code', { questionId: pool[0].questionId, workspace: { tabs: 'not a list' } });
		await pause(RELAY_WAIT_MS);
		expect(teammate).toEqual([]);
	});
});

// ---------------------------------------------------------------------------
// US-6-T-7: GameService should keep a readable reference of every player's
// shared code and hand a joining or reconnecting player a "game:code:snapshot"
// of their teammates' saved workspaces, so the practice editor can show a
// teammate's workspace read only even if the viewer missed the live updates
// (see src/server.ts, "game:code:snapshot").
// ---------------------------------------------------------------------------

// A second workspace, so tests can tell which of two shares was saved last.
const WORKSPACE_2 = { tabs: [{ id: 'tab-1', name: 'Tab 1', code: 'def solve():\n    return 2' }], activeTabId: 'tab-1' };

// One entry of a `game:code:snapshot`: a teammate's saved workspace for one question.
interface SnapshotEntry {
	userId: string;
	displayName: string;
	questionId: number;
	workspace: typeof WORKSPACE;
}

// Disconnects `socket` and opens a fresh connection for `userId`, resolving with
// the new socket and the `game:code:snapshot` GameService sends on the way in.
// The snapshot listener has to be registered before connecting: GameService
// sends it immediately, so adding the listener after connect() could miss it.
async function reconnect(socket: Socket, userId: string, gameIdToJoin: string): Promise<{ socket: Socket; snapshot: SnapshotEntry[] }> {
	socket.disconnect();
	const rejoined = openSocket({ token: await tokenFor(userId), gameId: gameIdToJoin });
	const snapshot = nextEvent<SnapshotEntry[]>(rejoined, 'game:code:snapshot');
	const state = nextState(rejoined);
	rejoined.connect();
	await state;
	return { socket: rejoined, snapshot: await snapshot };
}

describe('saving teammates\' code for players who join later', () => {
	it('gives a reconnecting player the workspace a teammate shared earlier', async () => {
		const { game, sockets, pool } = await playingGame(2, 2);
		const relayed = nextEvent<CodePayload>(sockets[1], 'game:code');
		sockets[0].emit('game:code', { questionId: pool[0].questionId, workspace: WORKSPACE });
		await relayed;

		const { snapshot } = await reconnect(sockets[1], game.players[1].userId, game.gameId);

		expect(snapshot).toEqual([
			{ userId: game.players[0].userId, displayName: game.players[0].displayName, questionId: pool[0].questionId, workspace: WORKSPACE },
		]);
	});

	it('replaces a player\'s saved workspace instead of keeping both when they share the same question again', async () => {
		const { game, sockets, pool } = await playingGame(2, 2);
		sockets[0].emit('game:code', { questionId: pool[0].questionId, workspace: WORKSPACE });
		await nextEvent(sockets[1], 'game:code');
		sockets[0].emit('game:code', { questionId: pool[0].questionId, workspace: WORKSPACE_2 });
		await nextEvent(sockets[1], 'game:code');

		const { snapshot } = await reconnect(sockets[1], game.players[1].userId, game.gameId);

		expect(snapshot).toEqual([
			{ userId: game.players[0].userId, displayName: game.players[0].displayName, questionId: pool[0].questionId, workspace: WORKSPACE_2 },
		]);
	});

	it('saves a player\'s workspace for each question separately', async () => {
		const { game, sockets, pool } = await playingGame(2, 2);
		sockets[0].emit('game:code', { questionId: pool[0].questionId, workspace: WORKSPACE });
		await nextEvent(sockets[1], 'game:code');
		sockets[0].emit('game:code', { questionId: pool[1].questionId, workspace: WORKSPACE_2 });
		await nextEvent(sockets[1], 'game:code');

		const { snapshot } = await reconnect(sockets[1], game.players[1].userId, game.gameId);

		expect(snapshot.map((entry) => entry.questionId).sort()).toEqual([pool[0].questionId, pool[1].questionId].sort());
	});

	it('never includes the reconnecting player\'s own saved workspace', async () => {
		const { game, sockets, pool } = await playingGame(2, 2);
		sockets[1].emit('game:code', { questionId: pool[0].questionId, workspace: WORKSPACE });
		await nextEvent(sockets[0], 'game:code');

		const { snapshot } = await reconnect(sockets[1], game.players[1].userId, game.gameId);

		expect(snapshot).toEqual([]);
	});

	it('never includes a player from the other team', async () => {
		const { game, sockets, pool } = await playingGame(2, 2);
		sockets[2].emit('game:code', { questionId: pool[0].questionId, workspace: WORKSPACE });
		await pause(RELAY_WAIT_MS);

		const { snapshot } = await reconnect(sockets[1], game.players[1].userId, game.gameId);

		expect(snapshot).toEqual([]);
	});

	it('does not save a malformed workspace', async () => {
		const { game, sockets, pool } = await playingGame(2, 2);
		sockets[0].emit('game:code', { questionId: pool[0].questionId, workspace: { tabs: 'not a list' } });
		await pause(RELAY_WAIT_MS);

		const { snapshot } = await reconnect(sockets[1], game.players[1].userId, game.gameId);

		expect(snapshot).toEqual([]);
	});

	it('does not include a teammate who hasn\'t shared any code', async () => {
		const { game, sockets } = await playingGame(2, 2);

		const { snapshot } = await reconnect(sockets[1], game.players[1].userId, game.gameId);

		expect(snapshot).toEqual([]);
	});
});

// ---------------------------------------------------------------------------
// US-6-T-8: scoring submissions by the percent of testcases passed. Points
// are floor(passed / total * {Easy: 150, Medium: 300, Hard: 450}); a team is
// only credited once per problem for the best score it has reached on it
// (see src/server.ts, "game:submit" and pointsForSubmission).
// ---------------------------------------------------------------------------

// The fake CodeService's pool is always 6 Easy + 3 Medium (see fixtures.ts),
// so every scoring test can rely on finding one of each.
function requireProblem(problems: PoolProblemPayload[], difficulty: string): PoolProblemPayload {
	const found = problems.find((problem) => problem.difficulty === difficulty);
	if (!found) throw new Error(`No ${difficulty} problem in the pool`);
	return found;
}

describe('awarding points by percent of testcases passed', () => {
	it('awards an Easy problem\'s full points for passing every case', () => {
		expect(pointsForSubmission('Easy', 3, 3)).toBe(150);
	});

	it('awards a Medium problem partial points for the fraction of cases it passed', () => {
		expect(pointsForSubmission('Medium', 2, 3)).toBe(200);
	});

	it('awards a Hard problem partial points for the fraction of cases it passed', () => {
		expect(pointsForSubmission('Hard', 1, 4)).toBe(112);
	});

	it('awards no points for passing none of a problem\'s cases', () => {
		expect(pointsForSubmission('Easy', 0, 3)).toBe(0);
	});
});

describe('scoring submissions', () => {
	it('adds a scored submission\'s points to the submitting player\'s team score', async () => {
		const { sockets, pool: matchPool } = await playingGame(1, 1);
		const easy = requireProblem(matchPool, 'Easy');
		const scored = nextState(sockets[0], (state) => state.scores.a > 0);
		await submit(sockets[0], easy.questionId, 'correct');
		expect((await scored).scores.a).toBe(150);
	});

	it('sends the updated score to the whole game room, not just the submitter', async () => {
		const { sockets, pool: matchPool } = await playingGame(1, 1);
		const easy = requireProblem(matchPool, 'Easy');
		// sockets[1] is team b; broadcastState reaches every player in the match.
		const scored = nextState(sockets[1], (state) => state.scores.a > 0);
		await submit(sockets[0], easy.questionId, 'correct');
		expect((await scored).scores.a).toBe(150);
	});

	it('does not lower a team\'s score when a resubmission scores fewer points', async () => {
		const { sockets, pool: matchPool } = await playingGame(1, 1);
		const medium = requireProblem(matchPool, 'Medium');
		await submit(sockets[0], medium.questionId, 'partial:3/3'); // 300 points
		await pause(AFTER_COOLDOWN_MS);
		const resubmitted = nextState(sockets[0]);
		await submit(sockets[0], medium.questionId, 'partial:1/3'); // would be 100 points
		expect((await resubmitted).scores.a).toBe(300);
	});

	it('raises a team\'s score by only the difference when a resubmission scores more points', async () => {
		const { sockets, pool: matchPool } = await playingGame(1, 1);
		const medium = requireProblem(matchPool, 'Medium');
		await submit(sockets[0], medium.questionId, 'partial:1/3'); // 100 points
		await pause(AFTER_COOLDOWN_MS);
		const resubmitted = nextState(sockets[0]);
		await submit(sockets[0], medium.questionId, 'partial:3/3'); // 300 points
		expect((await resubmitted).scores.a).toBe(300);
	});

	it('does not change a team\'s score when a resubmission scores the same points again', async () => {
		const { sockets, pool: matchPool } = await playingGame(1, 1);
		const medium = requireProblem(matchPool, 'Medium');
		await submit(sockets[0], medium.questionId, 'partial:2/3'); // 200 points
		await pause(AFTER_COOLDOWN_MS);
		const resubmitted = nextState(sockets[0]);
		await submit(sockets[0], medium.questionId, 'partial:2/3'); // still 200 points
		expect((await resubmitted).scores.a).toBe(200);
	});
});

describe('saving scored submissions', () => {
	it('saves a scored submission with the player, problem and points it was awarded', async () => {
		const { game, sockets, pool: matchPool } = await playingGame(1, 1);
		const easy = requireProblem(matchPool, 'Easy');
		await submit(sockets[0], easy.questionId, 'correct');
		const saved = await pool.query(
			'SELECT user_id, task_id, test_cases_passed, test_cases_total, points_awarded FROM submissions WHERE game_id = $1',
			[game.gameId],
		);
		expect(saved.rows).toEqual([{
			user_id: game.players[0].userId,
			task_id: easy.taskId,
			test_cases_passed: 3,
			test_cases_total: 3,
			points_awarded: 150,
		}]);
	});
});
