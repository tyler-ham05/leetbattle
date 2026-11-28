// US-7-T-5 Recent matches: the last-10 rating chart's data in GET /me and GET /users/:id
//
// Recent matches: GET /me and GET /users/:id `recentMatches`
//  - A player who just signed up should have recentMatches [] in GET /me
//  - After a reported 1v1 win, the winner's GET /me recentMatches should have 1 entry
//  - That entry's result should be 'W'
//  - That entry's change should equal the change in the match-results response
//  - That entry's ratingAfter should equal the newRating in the match-results response
//  - That entry's playedAt should be an ISO date string
//  - In a 1v1, the entry's teamSize should be 1
//  - In a 2v2, the entry's teamSize should be 2
//  - The loser of a 1v1 should have an entry with result 'L'
//  - After a draw, the entry's result should be 'D'
//  - After 12 reported matches, only 10 entries should be returned
//  - After 12 reported matches, the entries should be the last 10, oldest first (the first returned is the 3rd match)
//  - GET /users/:id should also return the player's recentMatches
//  - An unknown user in the payload should create no match_history row
//  - An unknown user in the payload should not stop the known player getting their entry
//  - The signup response's user should include recentMatches []
import { randomUUID } from 'node:crypto';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { request } from './setup';
import { pool } from '../src/db';

// The key GameService and AuthService share; tests set their own.
const INTERNAL_KEY = 'test-internal-api-key';

beforeAll(() => {
	process.env.INTERNAL_API_KEY = INTERNAL_KEY;
});

interface Player { id: string; token: string }

interface ReportedChange { userId: string; oldRating: number; newRating: number; change: number }

// Signs up a fresh player and returns their id and login token.
async function signUp(): Promise<Player> {
	const res = await request.post('/signup').send({
		email: `recent-${randomUUID()}@example.com`,
		password: 'correct-horse-battery-staple',
		name: 'Recent Player',
	});
	return { id: res.body.user.id, token: res.body.token };
}

// GET /me as `player`: their recent matches.
async function recentOf(player: Player) {
	const res = await request.get('/me').set('Authorization', `Bearer ${player.token}`);
	return res.body.user.recentMatches;
}

// POST /internal/match-results the way GameService sends it.
function report(body: unknown) {
	return request.post('/internal/match-results').set('Authorization', `Bearer ${INTERNAL_KEY}`).send(body);
}

// A 1v1 between two players, with `winner` ('a', 'b' or null for a draw).
async function oneVsOne(winner: 'a' | 'b' | null, a?: Player, b?: Player) {
	const [first, second] = a && b ? [a, b] : await Promise.all([signUp(), signUp()]);
	const res = await report({ gameId: randomUUID(), winner, players: [{ userId: first.id, team: 'a' }, { userId: second.id, team: 'b' }] });
	const changeOf = (player: Player): ReportedChange => res.body.players.find((entry: ReportedChange) => entry.userId === player.id);
	return { a: first, b: second, changeOf };
}

describe('US-7-T-5 recentMatches for a new player', () => {
	it('US-7-T-5 gives a new player an empty recentMatches in GET /me', async () => {
		expect(await recentOf(await signUp())).toEqual([]);
	});

	// The app uses the signup response as the signed-in user straight away.
	it('US-7-T-5 includes an empty recentMatches in the signup response', async () => {
		const res = await request.post('/signup').send({
			email: `recent-${randomUUID()}@example.com`,
			password: 'correct-horse-battery-staple',
		});
		expect(res.body.user.recentMatches).toEqual([]);
	});
});

describe('US-7-T-5 a reported match is recorded in recentMatches', () => {
	it('US-7-T-5 gives the winner of a 1v1 one entry', async () => {
		const { a } = await oneVsOne('a');
		expect(await recentOf(a)).toHaveLength(1);
	});

	it('US-7-T-5 records a win as W', async () => {
		const { a } = await oneVsOne('a');
		expect((await recentOf(a))[0].result).toBe('W');
	});

	it('US-7-T-5 records the change from the match-results response', async () => {
		const { a, changeOf } = await oneVsOne('a');
		expect((await recentOf(a))[0].change).toBe(changeOf(a).change);
	});

	it('US-7-T-5 records the rating after the match', async () => {
		const { a, changeOf } = await oneVsOne('a');
		expect((await recentOf(a))[0].ratingAfter).toBe(changeOf(a).newRating);
	});

	// The frontend parses it with new Date(), so it must round-trip as ISO.
	it('US-7-T-5 gives playedAt as an ISO date string', async () => {
		const { a } = await oneVsOne('a');
		const { playedAt } = (await recentOf(a))[0];
		expect(new Date(playedAt).toISOString()).toBe(playedAt);
	});

	it('US-7-T-5 records a team size of 1 for a 1v1', async () => {
		const { a } = await oneVsOne('a');
		expect((await recentOf(a))[0].teamSize).toBe(1);
	});

	it('US-7-T-5 records a team size of 2 for a 2v2', async () => {
		const players = await Promise.all(Array.from({ length: 4 }, signUp));
		await report({
			gameId: randomUUID(),
			winner: 'b',
			players: players.map((player, i) => ({ userId: player.id, team: i < 2 ? 'a' : 'b' })),
		});
		expect((await recentOf(players[0]))[0].teamSize).toBe(2);
	});

	it('US-7-T-5 records a loss as L for the loser', async () => {
		const { b } = await oneVsOne('a');
		expect((await recentOf(b))[0].result).toBe('L');
	});

	it('US-7-T-5 records a draw as D', async () => {
		const { a } = await oneVsOne(null);
		expect((await recentOf(a))[0].result).toBe('D');
	});
});

describe('US-7-T-5 recentMatches keeps only the last 10, oldest first', () => {
	// Twelve 1v1s between the same two players, one after another; each
	// match's newRating for `a` is kept to compare with what GET /me returns.
	async function twelveMatches() {
		const [a, b] = await Promise.all([signUp(), signUp()]);
		const ratingsAfter: number[] = [];
		for (let i = 0; i < 12; i++) {
			const { changeOf } = await oneVsOne(i % 3 === 0 ? 'b' : 'a', a, b);
			ratingsAfter.push(changeOf(a).newRating);
		}
		return { a, ratingsAfter };
	}

	it('US-7-T-5 returns only 10 entries after 12 matches', async () => {
		const { a } = await twelveMatches();
		expect(await recentOf(a)).toHaveLength(10);
	});

	// Matches 3 to 12, in the order they were played.
	it('US-7-T-5 returns the last 10 matches oldest first', async () => {
		const { a, ratingsAfter } = await twelveMatches();
		const recent: { ratingAfter: number }[] = await recentOf(a);
		expect(recent.map((match) => match.ratingAfter)).toEqual(ratingsAfter.slice(2));
	});
});

describe('US-7-T-5 recentMatches on another player\'s profile', () => {
	it('US-7-T-5 returns recentMatches from GET /users/:id', async () => {
		const { a, b } = await oneVsOne('a');
		const res = await request.get(`/users/${a.id}`).set('Authorization', `Bearer ${b.token}`);
		expect(res.body.user.recentMatches).toHaveLength(1);
	});
});

describe('US-7-T-5 an unknown user in a reported match', () => {
	it('US-7-T-5 creates no match_history row for an unknown user', async () => {
		const player = await signUp();
		const stranger = randomUUID();
		await report({ gameId: randomUUID(), winner: 'a', players: [{ userId: player.id, team: 'a' }, { userId: stranger, team: 'b' }] });
		const rows = await pool.query('SELECT 1 FROM match_history WHERE user_id = $1', [stranger]);
		expect(rows.rowCount).toBe(0);
	});

	it('US-7-T-5 still records the known player\'s match', async () => {
		const player = await signUp();
		await report({ gameId: randomUUID(), winner: 'a', players: [{ userId: player.id, team: 'a' }, { userId: randomUUID(), team: 'b' }] });
		expect(await recentOf(player)).toHaveLength(1);
	});
});

// Code review: reports that can't be rated must fail cleanly.
describe('reports that cannot be rated', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	// With nobody on the other team the opponents' average is 0/0 (NaN).
	it('returns 400 when every player is on one team', async () => {
		const [a, b] = [await signUp(), await signUp()];
		const res = await report({ gameId: randomUUID(), winner: 'a', players: [{ userId: a.id, team: 'a' }, { userId: b.id, team: 'a' }] });
		expect(res.status).toBe(400);
	});

	// pool.connect() failing used to leave the request hanging with an unhandled rejection.
	it('answers 500 when the database cannot be reached', async () => {
		const [a, b] = [await signUp(), await signUp()];
		vi.spyOn(pool, 'connect').mockRejectedValueOnce(new Error('database is down') as never);
		const res = await report({ gameId: randomUUID(), winner: 'a', players: [{ userId: a.id, team: 'a' }, { userId: b.id, team: 'b' }] });
		expect(res.status).toBe(500);
	});
});
