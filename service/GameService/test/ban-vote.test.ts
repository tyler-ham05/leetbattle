// US-8-T-1: the ban phase is a team vote.
// Pseudocode these tests were written from: test/ban-vote-pseudo.md
//
// A player votes for one question and may change that vote until the window
// closes; nothing leaves the pool until the server resolves the vote. Then
// each team bans the question its own members voted for most, which is why the
// pool is fetched two questions bigger than the match plays.
//
// Two things make the outcome predictable here. test/setup.ts gives the server
// a `choose` that always takes the first candidate, so a tie or a team that
// did not vote lands on a known question instead of a random one; and the ban
// window always runs in full, so every test that wants a resolved ban waits
// for the state the server sends when the window closes.
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { EncryptJWT } from 'jose';
import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import { gameServer, request, socketUrl } from './setup';
import { fakeCodeServiceFetch, sixReadyPlayers } from './fixtures';
import type { ReadyPlayer } from './fixtures';

const SECRET = 'local-test-secret-'.padEnd(64, 'x');
// Matches the ban window test/setup.ts gives the server. The reconnect window
// it gives (300 ms) is shorter, so a player can run out of time to reconnect
// while the bans are still going on.
const BAN_WINDOW_MS = 700;

// One teammate's vote, as that team's own ban screen shows it. A vote never
// carries a team: a player only ever receives their own team's votes.
interface VotePayload {
	userId: string;
	displayName: string;
}

interface PoolProblemPayload {
	taskId: string;
	questionId: number;
	difficulty: string;
	topics: string[];
	votes: VotePayload[];
}

// One question a team banned, as the reveal shows it.
interface BannedProblemPayload {
	questionId: number;
	taskId: string;
	difficulty: string;
	topics: string[];
	team: 'a' | 'b';
	position: number;
}

interface BansPayload {
	perTeam: number;
	questionsInPlay: number;
	votesCast: number;
	voters: number;
	revealSecondsRemaining: number;
	banned: BannedProblemPayload[];
}

interface GameStatePayload {
	phase: 'waiting' | 'banning' | 'picking' | 'playing' | 'ended';
	bans: BansPayload;
	problemPool: PoolProblemPayload[];
	players: { userId: string; team: 'a' | 'b'; connected: boolean; left: boolean }[];
}

// What GameService answers a `game:ban` with: ok, or why the vote was refused.
interface BanResponse {
	ok?: boolean;
	error?: string;
}

let clients: Socket[] = [];

async function tokenFor(userId: string): Promise<string> {
	return new EncryptJWT({ id: userId, email: `${userId}@example.test` })
		.setProtectedHeader({ alg: 'dir', enc: 'A256CBC-HS512' })
		.setIssuedAt()
		.setExpirationTime('5m')
		.encrypt(new TextEncoder().encode(SECRET));
}

// Resolves with the next `game:state` that satisfies `predicate`, so a test can
// wait for the state it means to check rather than whichever arrives first.
function nextState(socket: Socket, predicate: (_state: GameStatePayload) => boolean = () => true): Promise<GameStatePayload> {
	return new Promise((resolve, reject) => {
		const timeout = setTimeout(() => {
			socket.off('game:state', onState);
			reject(new Error('Timed out waiting for the expected game state'));
		}, 3_000);
		const onState = (state: GameStatePayload) => {
			if (!predicate(state)) return;
			clearTimeout(timeout);
			socket.off('game:state', onState);
			resolve(state);
		};
		socket.on('game:state', onState);
	});
}

function openSocket(auth: Record<string, unknown>): Socket {
	const client = io(socketUrl(), { autoConnect: false, reconnection: false, transports: ['websocket'], auth });
	clients.push(client);
	return client;
}

// Connects `userId` to a game and resolves once the server has sent them their
// first `game:state`.
async function joinGame(userId: string, gameId: string): Promise<{ socket: Socket; state: GameStatePayload }> {
	const socket = openSocket({ token: await tokenFor(userId), gameId });
	const state = nextState(socket);
	socket.connect();
	return { socket, state: await state };
}

// Creates a game with `teamA` players on team a and `teamB` on team b.
async function newGame(teamA: number, teamB: number): Promise<{ gameId: string; players: ReadyPlayer[] }> {
	const roster = sixReadyPlayers().slice(0, teamA + teamB)
		.map((player, i) => ({ ...player, team: (i < teamA ? 'a' : 'b') as 'a' | 'b' }));
	const res = await request.put('/game').send({ players: roster });
	return { gameId: res.body.gameId, players: roster };
}

// A game with every player connected, resolved once the bans have started. The
// sockets come back in roster order, so sockets[0] is on team a and the last
// socket is on team b.
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

// Votes for `questionId` as the player on `socket`.
function vote(socket: Socket, questionId: number): Promise<BanResponse> {
	return socket.timeout(2_000).emitWithAck('game:ban', { questionId });
}

// Resolves with the state the server sends when the ban window closes: the
// bans are decided and the reveal is up.
function nextReveal(socket: Socket): Promise<GameStatePayload> {
	return nextState(socket, (state) => state.bans.banned.length > 0);
}

// The votes the receiving team can see on one question.
function votesOn(state: GameStatePayload, questionId: number): VotePayload[] {
	return state.problemPool.find((problem) => problem.questionId === questionId)?.votes ?? [];
}

// Every question the receiving team can see its own votes on.
function votedQuestions(state: GameStatePayload): number[] {
	return state.problemPool.filter((problem) => problem.votes.length > 0).map((problem) => problem.questionId);
}

// The question `team` banned, out of the reveal's banned list.
function bannedFor(state: GameStatePayload, team: 'a' | 'b'): BannedProblemPayload | undefined {
	return state.bans.banned.find((banned) => banned.team === team);
}

async function waitForServerSockets(count: number): Promise<void> {
	const deadline = Date.now() + 2_000;
	while (gameServer.io.sockets.sockets.size !== count) {
		if (Date.now() > deadline) throw new Error('Timed out waiting for sockets to close');
		await new Promise((resolve) => setTimeout(resolve, 10));
	}
}

beforeAll(() => {
	process.env.SECRET = SECRET;
	vi.stubGlobal('fetch', fakeCodeServiceFetch());
});

beforeEach(() => {
	vi.clearAllMocks();
});

afterEach(async () => {
	for (const client of clients) client.disconnect();
	clients = [];
	await waitForServerSockets(0);
});

afterAll(() => {
	vi.unstubAllGlobals();
});

describe('voting for a question', () => {
	it('puts the player\'s vote on the question they voted for', async () => {
		const { game, sockets, pool } = await banningGame(2, 2);
		const voted = nextState(sockets[0], (state) => votesOn(state, pool[0].questionId).length > 0);
		await vote(sockets[0], pool[0].questionId);
		expect(votesOn(await voted, pool[0].questionId).map((entry) => entry.userId))
			.toEqual([game.players[0].userId]);
	});

	it('leaves a player\'s vote only on the question they voted for last', async () => {
		const { sockets, pool } = await banningGame(2, 2);
		await vote(sockets[0], pool[0].questionId);
		const moved = nextState(sockets[0], (state) => votesOn(state, pool[1].questionId).length > 0);
		await vote(sockets[0], pool[1].questionId);
		// One expect for both halves of the move: it landed on the second
		// question and left the first.
		expect(votedQuestions(await moved)).toEqual([pool[1].questionId]);
	});

	it('lets two players on the same team vote for the same question', async () => {
		const { game, sockets, pool } = await banningGame(2, 2);
		// sockets[0] and sockets[1] are both on team a: this is how a team
		// reaches a majority.
		await vote(sockets[0], pool[0].questionId);
		const both = nextState(sockets[0], (state) => votesOn(state, pool[0].questionId).length === 2);
		await vote(sockets[1], pool[0].questionId);
		expect(votesOn(await both, pool[0].questionId).map((entry) => entry.userId))
			.toEqual([game.players[0].userId, game.players[1].userId]);
	});

	it('removes nothing from the pool when a player votes', async () => {
		const { sockets, pool } = await banningGame(2, 2);
		const voted = nextState(sockets[0], (state) => votesOn(state, pool[0].questionId).length > 0);
		await vote(sockets[0], pool[0].questionId);
		// Only the server removes questions, and only when the window closes.
		expect((await voted).problemPool).toHaveLength(8);
	});

	it('refuses a vote once the bans have been decided', async () => {
		const { sockets, pool } = await banningGame(2, 2);
		// The window has closed and the reveal is up, so the vote is too late.
		await nextReveal(sockets[0]);
		expect((await vote(sockets[0], pool[0].questionId)).error).toBe('not-banning');
	});

	it('runs the full ban window even once every player has voted', async () => {
		// Timed from before the game even starts banning, not after, so the
		// server's own window start (which the client only learns about once its
		// broadcast arrives) can never land before this clock does -- otherwise a
		// slow test runner could make the measured window look shorter than the
		// real one and fail this assertion despite the server behaving correctly.
		const started = Date.now();
		const { sockets, pool } = await banningGame(2, 2);
		const reveal = nextReveal(sockets[0]);
		for (const socket of sockets) await vote(socket, pool[0].questionId);
		await reveal;
		// Every player voted at once, so an early finish would show up here.
		expect(Date.now() - started >= BAN_WINDOW_MS).toBe(true);
	});
});

describe('votes inside a team', () => {
	it('shows a teammate\'s vote, named, and counts it for the team', async () => {
		const { game, sockets, pool } = await banningGame(2, 2);
		// Listening on the teammate's socket, not the voter's. The fixtures name
		// the first player "player-0".
		const seen = nextState(sockets[1], (state) => votesOn(state, pool[0].questionId).length > 0);
		await vote(sockets[0], pool[0].questionId);
		const state = await seen;
		expect({ votes: votesOn(state, pool[0].questionId), votesCast: state.bans.votesCast })
			.toEqual({ votes: [{ userId: game.players[0].userId, displayName: 'player-0' }], votesCast: 1 });
	});

	it('never shows a vote to the other team', async () => {
		const { sockets, pool } = await banningGame(2, 2);
		// sockets[2] is on team b. Waiting for team a's own copy first, so team
		// b's state has certainly been sent by then.
		const teamA = nextState(sockets[1], (state) => votesOn(state, pool[0].questionId).length > 0);
		const teamB = nextState(sockets[2]);
		await vote(sockets[0], pool[0].questionId);
		await teamA;
		expect(votedQuestions(await teamB)).toEqual([]);
	});
});

describe('a player who runs out of time to reconnect', () => {
	it('still counts the vote they cast before dropping', async () => {
		const { game, sockets, pool } = await banningGame(2, 2);
		const reveal = nextReveal(sockets[0]);
		// sockets[1] (team a) votes, then drops and stays gone long enough to
		// count as having left, which happens while the bans are still going on.
		await vote(sockets[1], pool[3].questionId);
		const left = nextState(sockets[0], (state) => state.players.some((player) => player.userId === game.players[1].userId && player.left));
		sockets[1].disconnect();
		await left;
		expect(bannedFor(await reveal, 'a')?.questionId).toBe(pool[3].questionId);
	});

	it('refuses a vote from them once they have reconnected', async () => {
		const { game, sockets, pool } = await banningGame(2, 2);
		const leaving = game.players[1].userId;
		const left = nextState(sockets[0], (state) => state.players.some((player) => player.userId === leaving && player.left));
		sockets[1].disconnect();
		await left;
		// Back in the match, but their team has already been counted on the vote
		// they left behind, so they cannot change it.
		const { socket } = await joinGame(leaving, game.gameId);
		expect((await vote(socket, pool[0].questionId)).error).toBe('vote-locked');
	});
});

describe('banning what each team voted for', () => {
	it('bans the question a team\'s majority voted for', async () => {
		const { sockets, pool } = await banningGame(3, 3);
		const reveal = nextReveal(sockets[0]);
		// Two of team a's three players vote for the third question, the other
		// for the first, so the third question is team a's majority.
		await vote(sockets[0], pool[2].questionId);
		await vote(sockets[1], pool[2].questionId);
		await vote(sockets[2], pool[0].questionId);
		expect(bannedFor(await reveal, 'a')?.questionId).toBe(pool[2].questionId);
	});

	it('ignores the other team\'s votes when banning for a team', async () => {
		const { sockets, pool } = await banningGame(3, 3);
		const reveal = nextReveal(sockets[0]);
		// Team b piles three votes onto the second question; team a's single
		// vote for the fourth is still what team a bans.
		await vote(sockets[0], pool[3].questionId);
		for (const socket of sockets.slice(3)) await vote(socket, pool[1].questionId);
		expect(bannedFor(await reveal, 'a')?.questionId).toBe(pool[3].questionId);
	});
});

describe('ties, teams that did not vote, and both teams voting the same', () => {
	it('settles a tie among the questions tied at the top', async () => {
		const { sockets, pool } = await banningGame(3, 3);
		const reveal = nextReveal(sockets[0]);
		// One vote each for the third and the second question: both tie at one,
		// and the match's choice takes the earlier of the two in the pool.
		await vote(sockets[0], pool[2].questionId);
		await vote(sockets[1], pool[1].questionId);
		expect(bannedFor(await reveal, 'a')?.questionId).toBe(pool[1].questionId);
	});

	it('bans a question still in the pool for a team that did not vote', async () => {
		const { sockets, pool } = await banningGame(2, 2);
		const reveal = nextReveal(sockets[0]);
		// Only team a votes, for the last question. Team b has no usable votes,
		// so every question still in the pool is a candidate for its ban.
		await vote(sockets[0], pool[pool.length - 1].questionId);
		expect(bannedFor(await reveal, 'b')?.questionId).toBe(pool[0].questionId);
	});

	it('bans two different questions when both teams vote for the same one', async () => {
		const { sockets, pool } = await banningGame(2, 2);
		const reveal = nextReveal(sockets[0]);
		// Both teams pile onto the first question. Whichever team bans it, the
		// other team's votes no longer point at anything in the pool, so its ban
		// falls to the rule for a team with no usable votes.
		for (const socket of sockets) await vote(socket, pool[0].questionId);
		const state = await reveal;
		expect(new Set(state.bans.banned.map((entry) => entry.questionId)).size).toBe(2);
	});
});

describe('showing the bans before the match moves on', () => {
	it('stays in the ban phase for the reveal, with one ban per team', async () => {
		const { sockets } = await banningGame(2, 2);
		const state = await nextReveal(sockets[0]);
		expect({ phase: state.phase, teams: state.bans.banned.map((entry) => entry.team).sort() })
			.toEqual({ phase: 'banning', teams: ['a', 'b'] });
	});

	it('keeps a banned question\'s place in the pool, with its topics', async () => {
		const { sockets, pool } = await banningGame(2, 2);
		const reveal = nextReveal(sockets[0]);
		// The fifth question of the pool, so position five.
		await vote(sockets[0], pool[4].questionId);
		const banned = bannedFor(await reveal, 'a');
		expect({ position: banned?.position, topics: banned?.topics })
			.toEqual({ position: 5, topics: pool[4].topics });
	});
});
