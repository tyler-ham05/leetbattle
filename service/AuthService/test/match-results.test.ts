// US-7-T-1 A new player's rating, and POST /internal/match-results
//
// A new player (AC1)
//  - A player who just signed up should have a rating of 100 in GET /me
//  - A player who just signed up should be in the Bronze II league in GET /me
//  - A player who just signed up should have 0 wins, 0 losses and 0 draws in GET /me
// POST /internal/match-results (AC6, AC7)
//  - Without an Authorization header it should return 401
//  - With the wrong internal key it should return 401
//  - With the wrong internal key, no player's rating should change
//  - With a player's own login token (not the internal key) it should return 401
//  - A malformed body (no players) should return 400
//  - After a Team A win, a Team A player's rating in GET /me should go up
//  - After a Team A win, a Team B player's rating in GET /me should go down
//  - After a Team A win, a Team A player's wins in GET /me should be 1
//  - After a Team A win, a Team B player's losses in GET /me should be 1
//  - After a draw, a player's draws in GET /me should be 1
//  - Every change should use the ratings from before the match: in the worked example sent as one result, the 350 should end at 370 (not a value based on a teammate's new rating)
//  - A listed user who doesn't exist should be skipped, and the other players should still be updated
//  - The response should list each updated player's oldRating, newRating and change
import { randomUUID } from 'node:crypto';
import { beforeAll, describe, expect, it } from 'vitest';
import { request } from './setup';
import { pool } from '../src/db';

// The key GameService and AuthService share; tests set their own.
const INTERNAL_KEY = 'test-internal-api-key';

beforeAll(() => {
	process.env.INTERNAL_API_KEY = INTERNAL_KEY;
});

interface Player { id: string; token: string }

// Signs up a fresh player and returns their id and login token.
async function signUp(): Promise<Player> {
	const res = await request.post('/signup').send({
		email: `rating-${randomUUID()}@example.com`,
		password: 'correct-horse-battery-staple',
		name: 'Rated Player',
	});
	return { id: res.body.user.id, token: res.body.token };
}

// GET /me as `player`: their profile, including the rating fields.
async function profileOf(player: Player) {
	const res = await request.get('/me').set('Authorization', `Bearer ${player.token}`);
	return res.body.user;
}

// Sets a player's rating directly, to set up a match from known ratings.
async function setRating(player: Player, rating: number) {
	await pool.query('UPDATE users SET rating = $1 WHERE id = $2', [rating, player.id]);
}

// POST /internal/match-results the way GameService sends it.
function report(body: unknown, key: string | null = INTERNAL_KEY) {
	const req = request.post('/internal/match-results');
	if (key !== null) req.set('Authorization', `Bearer ${key}`);
	return req.send(body);
}

// A 1v1 between two fresh players, with `winner` ('a', 'b' or null for a draw).
async function oneVsOne(winner: 'a' | 'b' | null) {
	const [a, b] = await Promise.all([signUp(), signUp()]);
	const res = await report({ gameId: randomUUID(), winner, players: [{ userId: a.id, team: 'a' }, { userId: b.id, team: 'b' }] });
	return { a, b, res };
}

describe('US-7-T-1 a new player', () => {
	it('US-7-T-1 starts a new player at a rating of 100', async () => {
		const profile = await profileOf(await signUp());
		expect(profile.rating).toBe(100);
	});

	it('US-7-T-1 puts a new player in Bronze II', async () => {
		const profile = await profileOf(await signUp());
		expect(profile.league).toBe('Bronze II');
	});

	it('US-7-T-1 starts a new player with no wins, losses or draws', async () => {
		const profile = await profileOf(await signUp());
		expect({ wins: profile.wins, losses: profile.losses, draws: profile.draws }).toEqual({ wins: 0, losses: 0, draws: 0 });
	});
});

describe('US-7-T-1 POST /internal/match-results only accepts GameService', () => {
	it('US-7-T-1 returns 401 without an Authorization header', async () => {
		const res = await report({ gameId: randomUUID(), winner: 'a', players: [] }, null);
		expect(res.status).toBe(401);
	});

	it('US-7-T-1 returns 401 with the wrong internal key', async () => {
		const res = await report({ gameId: randomUUID(), winner: 'a', players: [] }, 'not-the-key');
		expect(res.status).toBe(401);
	});

	it('US-7-T-1 changes no rating when the internal key is wrong', async () => {
		const player = await signUp();
		await report({ gameId: randomUUID(), winner: 'a', players: [{ userId: player.id, team: 'a' }] }, 'not-the-key');
		expect((await profileOf(player)).rating).toBe(100);
	});

	// A player's own login token proves who they are, not that they're GameService.
	it('US-7-T-1 returns 401 for a player\'s own login token', async () => {
		const player = await signUp();
		const res = await report({ gameId: randomUUID(), winner: 'a', players: [{ userId: player.id, team: 'a' }] }, player.token);
		expect(res.status).toBe(401);
	});

	it('US-7-T-1 returns 400 for a body with no players', async () => {
		const res = await report({ gameId: randomUUID(), winner: 'a' });
		expect(res.status).toBe(400);
	});
});

describe('US-7-T-1 POST /internal/match-results updates every player', () => {
	it('US-7-T-1 raises a winning player\'s rating', async () => {
		const { a } = await oneVsOne('a');
		expect((await profileOf(a)).rating).toBeGreaterThan(100);
	});

	it('US-7-T-1 lowers a losing player\'s rating', async () => {
		const { b } = await oneVsOne('a');
		expect((await profileOf(b)).rating).toBeLessThan(100);
	});

	it('US-7-T-1 counts a win for a winning player', async () => {
		const { a } = await oneVsOne('a');
		expect((await profileOf(a)).wins).toBe(1);
	});

	it('US-7-T-1 counts a loss for a losing player', async () => {
		const { b } = await oneVsOne('a');
		expect((await profileOf(b)).losses).toBe(1);
	});

	it('US-7-T-1 counts a draw when there is no winner', async () => {
		const { a } = await oneVsOne(null);
		expect((await profileOf(a)).draws).toBe(1);
	});

	// All six changes come from the pre-match ratings; if the 50 were saved as 79
	// first and Team A's average recalculated, the 350 would not land on 370.
	it('US-7-T-1 uses the pre-match ratings for every change in the worked example', async () => {
		const players = await Promise.all(Array.from({ length: 6 }, signUp));
		const ratings = [50, 350, 650, 450, 450, 450];
		await Promise.all(players.map((player, i) => setRating(player, ratings[i])));
		await report({
			gameId: randomUUID(),
			winner: 'a',
			players: players.map((player, i) => ({ userId: player.id, team: i < 3 ? 'a' : 'b' })),
		});
		expect((await profileOf(players[1])).rating).toBe(370);
	});

	it('US-7-T-1 skips a user it doesn\'t know and still updates the others', async () => {
		const player = await signUp();
		await report({ gameId: randomUUID(), winner: 'a', players: [{ userId: player.id, team: 'a' }, { userId: randomUUID(), team: 'b' }] });
		expect((await profileOf(player)).wins).toBe(1);
	});

	// Two players at 100: the winner expects 0.5, so they gain 16.
	it('US-7-T-1 lists each player\'s old rating, new rating and change', async () => {
		const { a, res } = await oneVsOne('a');
		expect(res.body.players.find((entry: { userId: string }) => entry.userId === a.id))
			.toEqual({ userId: a.id, oldRating: 100, newRating: 116, change: 16 });
	});
});
