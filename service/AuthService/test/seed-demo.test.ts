// US-7-T-5 The demo player seed (scripts/seed-demo.ts uses src/demo.ts)
//
// Runs only against the test database (see AGENTS.md / the task prompt):
//   AUTH_POSTGRES_DB=auth_service_test POSTGRES_PORT=5433 npx vitest run
//
// Demo player seed (scripts/seed-demo.ts)
//  - The 10 demo matches should number exactly 10
//  - The last demo match's ratingAfter should be the target rating (2046)
//  - Each demo match's ratingAfter should be the previous ratingAfter plus its change
//  - The demo matches should be ordered oldest first
//  - Running the seed should create the demo user with rating 2046
//  - Running the seed should give the demo user exactly 10 match_history rows
//  - Running the seed twice should still leave exactly 10 rows for the demo user
//  - Running the seed should not change another user's rating
//  - Running the seed should not remove another user's match_history rows
//  - The demo user should be able to log in with demo@leetbattle.local / demo-password
import { randomUUID } from 'node:crypto';
import { beforeAll, describe, expect, it } from 'vitest';
import { request } from './setup';
import { pool } from '../src/db';
import { DEMO, demoMatches, seedDemo } from '../src/demo';

const INTERNAL_KEY = 'test-internal-api-key';

beforeAll(() => {
	process.env.INTERNAL_API_KEY = INTERNAL_KEY;
});

// Signs up a fresh (non-demo) player and returns their id.
async function signUp(): Promise<string> {
	const res = await request.post('/signup').send({
		email: `seed-${randomUUID()}@example.com`,
		password: 'correct-horse-battery-staple',
	});
	return res.body.user.id;
}

// How many match_history rows a user has.
async function historyCount(userId: string): Promise<number> {
	const res = await pool.query('SELECT count(*)::int AS n FROM match_history WHERE user_id = $1', [userId]);
	return res.rows[0].n;
}

// The demo user's row, after seeding.
async function demoUser() {
	const res = await pool.query('SELECT id, rating FROM users WHERE email = $1', [DEMO.email]);
	return res.rows[0];
}

describe('US-7-T-5 the demo matches', () => {
	const now = new Date('2026-11-28T12:00:00Z');

	it('US-7-T-5 builds exactly 10 demo matches', () => {
		expect(demoMatches(now)).toHaveLength(10);
	});

	it('US-7-T-5 ends the demo matches at the target rating', () => {
		expect(demoMatches(now).at(-1)?.ratingAfter).toBe(2046);
	});

	// Every match moves the rating by exactly its change.
	it('US-7-T-5 keeps each ratingAfter consistent with the change', () => {
		const matches = demoMatches(now);
		const consistent = matches.slice(1).every((match, i) => match.ratingAfter === matches[i].ratingAfter + match.change);
		expect(consistent).toBe(true);
	});

	it('US-7-T-5 orders the demo matches oldest first', () => {
		const times = demoMatches(now).map((match) => match.playedAt.getTime());
		expect(times).toEqual([...times].sort((x, y) => x - y));
	});
});

describe('US-7-T-5 running the seed', () => {
	it('US-7-T-5 creates the demo user at a rating of 2046', async () => {
		await seedDemo();
		expect((await demoUser()).rating).toBe(2046);
	});

	it('US-7-T-5 gives the demo user exactly 10 matches', async () => {
		await seedDemo();
		expect(await historyCount((await demoUser()).id)).toBe(10);
	});

	it('US-7-T-5 still leaves 10 matches after seeding twice', async () => {
		await seedDemo();
		await seedDemo();
		expect(await historyCount((await demoUser()).id)).toBe(10);
	});

	it('US-7-T-5 does not change another user\'s rating', async () => {
		const other = await signUp();
		await pool.query('UPDATE users SET rating = 777 WHERE id = $1', [other]);
		await seedDemo();
		const res = await pool.query('SELECT rating FROM users WHERE id = $1', [other]);
		expect(res.rows[0].rating).toBe(777);
	});

	it('US-7-T-5 does not remove another user\'s matches', async () => {
		const other = await signUp();
		await request.post('/internal/match-results').set('Authorization', `Bearer ${INTERNAL_KEY}`)
			.send({ gameId: randomUUID(), winner: 'a', players: [{ userId: other, team: 'a' }, { userId: randomUUID(), team: 'b' }] });
		await seedDemo();
		expect(await historyCount(other)).toBe(1);
	});

	it('US-7-T-5 lets the demo user log in', async () => {
		await seedDemo();
		const res = await request.post('/login').send({ email: DEMO.email, password: DEMO.password });
		expect(res.status).toBe(200);
	});
});
