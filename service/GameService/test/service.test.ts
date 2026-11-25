import { randomUUID } from 'node:crypto';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';
import { request } from './setup';
import { TEST_SECRET, fakeCodeServiceFetch, loginTokenFor, sixReadyPlayers } from './fixtures';
import { pool } from '../src/db';

// Matches the CODE_SERVICE_URL fallback in src/service.ts (CodeService's own
// default port - see service/CodeService/src/index.ts).
const CODE_SERVICE_URL = 'http://localhost:4001';

// Every test in this file goes through createGame at least once (directly or
// via a beforeAll), and createGame now calls out to CodeService - stub
// global fetch for the whole file (a beforeAll, not beforeEach, so it's
// already in place for the GET /game/:id describe's own beforeAll) so no
// test depends on a running CodeService. Call history is cleared before
// each test so a test only sees the fetch calls it triggered itself.
let codeServiceFetch: Mock;

beforeAll(() => {
	// US-6-T-8: GET /game/:id checks the caller's login token against this SECRET.
	process.env.SECRET = TEST_SECRET;
	codeServiceFetch = fakeCodeServiceFetch();
	vi.stubGlobal('fetch', codeServiceFetch);
});

beforeEach(() => {
	codeServiceFetch.mockClear();
});

afterAll(() => {
	vi.unstubAllGlobals();
});

describe('health check', () => {
	it('returns 200 on request', async () => {
		const res = await request
			.get('/');
		expect(res.status).toBe(200);
	});
});

// SERVICE TESTS
// PUT game should start a game, taking a request that accepts the
// 6 players with their teams as the body
// PUT game should reject any malformed requests with a 400
// PUT game should accept smaller matches chosen in the lobby
//  - A 1v1 match (two players, one per team) should start
//  - A 2v2 match (four players, two per team) should start
//  - Teams of different sizes (three players vs one) should be rejected with a 400
// GET game/id should find the first active game ID from the playerID.
// If an active game doesn't exist, return 404

// Builds a roster with `teamA` players on team a and `teamB` on team b.
function roster(teamA: number, teamB: number) {
	return sixReadyPlayers().slice(0, teamA + teamB)
		.map((player, i) => ({ ...player, team: i < teamA ? 'a' : 'b' }));
}

describe('PUT /game with a chosen team size', () => {
	it('starts a 1v1 match', async () => {
		const res = await request.put('/game').send({ players: roster(1, 1) });
		expect(res.status).toBe(201);
	});

	it('starts a 2v2 match', async () => {
		const res = await request.put('/game').send({ players: roster(2, 2) });
		expect(res.status).toBe(201);
	});

	it('rejects teams of different sizes', async () => {
		const res = await request.put('/game').send({ players: roster(3, 1) });
		expect(res.status).toBe(400);
	});
});

describe('PUT /game', () => {
	it('starts a game for six players split across two teams', async () => {
		const res = await request
			.put('/game')
			.send({ players: sixReadyPlayers() });
		expect(res.status).toBe(201);
	});

	it('returns the new game\'s id', async () => {
		const res = await request
			.put('/game')
			.send({ players: sixReadyPlayers() });
		expect(typeof res.body.gameId).toBe('string');
	});

	it('rejects a request with no body as malformed', async () => {
		// No .send() call at all - players ends up undefined, which must fail
		// whatever validation checks for a six-player, two-team roster.
		const res = await request.put('/game');
		expect(res.status).toBe(400);
	});

	it('rejects a request without exactly six players as malformed', async () => {
		const fivePlayers = sixReadyPlayers().slice(0, 5);
		const res = await request
			.put('/game')
			.send({ players: fivePlayers });
		expect(res.status).toBe(400);
	});

	it('fetches the shared problem pool from CodeService as 8 easy + 3 medium questions for a 3v3', async () => {
		await request
			.put('/game')
			.send({ players: sixReadyPlayers() });
		const calledUrls = codeServiceFetch.mock.calls.map((call) => call[0] as string);
		expect(calledUrls).toEqual([
			`${CODE_SERVICE_URL}/problem?difficulty=Easy&quantity=8`,
			`${CODE_SERVICE_URL}/problem?difficulty=Medium&quantity=3`,
		]);
	});

	// The pool scales with team size and leaves room for both bans (US-8-T-1):
	// 3 questions per player plus one per ban, a third of them Medium, so a 2v2
	// asks CodeService for a smaller pool than a 3v3.
	it('fetches the shared problem pool from CodeService as 6 easy + 2 medium questions for a 2v2', async () => {
		const roster = sixReadyPlayers().slice(0, 4).map((player, i) => ({ ...player, team: (i < 2 ? 'a' : 'b') as 'a' | 'b' }));
		await request
			.put('/game')
			.send({ players: roster });
		const calledUrls = codeServiceFetch.mock.calls.map((call) => call[0] as string);
		expect(calledUrls).toEqual([
			`${CODE_SERVICE_URL}/problem?difficulty=Easy&quantity=6`,
			`${CODE_SERVICE_URL}/problem?difficulty=Medium&quantity=2`,
		]);
	});

	it('fetches the shared problem pool from CodeService as 4 easy + 1 medium questions for a 1v1', async () => {
		const roster = sixReadyPlayers().slice(0, 2).map((player, i) => ({ ...player, team: (i < 1 ? 'a' : 'b') as 'a' | 'b' }));
		await request
			.put('/game')
			.send({ players: roster });
		const calledUrls = codeServiceFetch.mock.calls.map((call) => call[0] as string);
		expect(calledUrls).toEqual([
			`${CODE_SERVICE_URL}/problem?difficulty=Easy&quantity=4`,
			`${CODE_SERVICE_URL}/problem?difficulty=Medium&quantity=1`,
		]);
	});

	// Covers the errorHandler's `err.status || 500` fallback in src/app.ts, which
	// every other test skips since createGame's own validation errors are always
	// thrown as an HttpError (which does carry a .status). A raw DB failure here
	// has no .status, so it should fall through to next(err) and surface as 500.
	describe('when the database fails mid-insert', () => {
		afterEach(() => {
			vi.restoreAllMocks();
		});

		it('responds 500 instead of the validation-error 400', async () => {
			vi.spyOn(pool, 'query').mockRejectedValueOnce(new Error('connection lost'));
			const res = await request
				.put('/game')
				.send({ players: sixReadyPlayers() });
			expect(res.status).toBe(500);
		});
	});
});

// PUT game should fail cleanly when CodeService can't supply the problems
//  - When CodeService responds with an error status, PUT game should respond with a 502
//  - When CodeService is unreachable, PUT game should respond with a 502
//  - When CodeService fails, none of the players should be saved to a game
// PUT game should never leave a half-saved game behind
//  - When saving fails partway (the same player listed twice), none of the players should be saved to a game
describe('PUT /game when it cannot finish creating the game', () => {
	// Players saved to any game for these user ids. Scoped to the test's own
	// roster, since other test files create games in the same database.
	async function savedPlayers(players: { userId: string }[]): Promise<number> {
		const result = await pool.query('SELECT 1 FROM players WHERE user_id = ANY($1::uuid[])', [players.map((player) => player.userId)]);
		return result.rowCount ?? 0;
	}

	function failingCodeService() {
		codeServiceFetch.mockResolvedValueOnce({ ok: false, status: 404, json: () => Promise.resolve({ message: 'problem not found' }) } as Response);
	}

	it('responds 502 when CodeService responds with an error', async () => {
		failingCodeService();
		const res = await request.put('/game').send({ players: sixReadyPlayers() });
		expect(res.status).toBe(502);
	});

	it('responds 502 when CodeService is unreachable', async () => {
		codeServiceFetch.mockRejectedValueOnce(new TypeError('fetch failed'));
		const res = await request.put('/game').send({ players: sixReadyPlayers() });
		expect(res.status).toBe(502);
	});

	it('saves none of the players when CodeService fails', async () => {
		failingCodeService();
		const players = sixReadyPlayers();
		await request.put('/game').send({ players });
		expect(await savedPlayers(players)).toBe(0);
	});

	it('saves none of the players when saving fails partway', async () => {
		// The last player is the first one again, so saving the roster breaks on
		// the (game_id, user_id) primary key after the earlier players are written.
		const players = sixReadyPlayers();
		players[5] = { ...players[0], team: 'b' };
		await request.put('/game').send({ players });
		expect(await savedPlayers(players)).toBe(0);
	});
});

describe('GET /game/:id', () => {
	let activeGameId: string;
	let activePlayerId: string;

	beforeAll(async () => {
		const players = sixReadyPlayers();
		activePlayerId = players[0].userId;
		const res = await request
			.put('/game')
			.send({ players });
		activeGameId = res.body.gameId;
	});

	it('finds the active game for a player who is in one', async () => {
		// US-6-T-8: the endpoint now needs the player's own login token.
		const res = await request.get(`/game/${activePlayerId}`).set('Authorization', `Bearer ${await loginTokenFor(activePlayerId)}`);
		expect(res.body.gameId).toBe(activeGameId);
	});

	it('returns 404 for a player with no active game', async () => {
		const loneUserId = randomUUID();
		const res = await request.get(`/game/${loneUserId}`).set('Authorization', `Bearer ${await loginTokenFor(loneUserId)}`);
		expect(res.status).toBe(404);
	});
});
