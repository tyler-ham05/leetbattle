// US-7-T-5: a demo player with a full profile and 10 recent matches, so the
// profile page (and its last-10 rating chart) can be shown without playing.
// Run with `npm run seed:demo` (scripts/seed-demo.ts). Only the demo user is
// written; no other user or their matches are touched.
import bcrypt from 'bcryptjs';
import { pool } from './db';

export const DEMO = {
	email: 'demo@leetbattle.local',
	password: 'demo-password',
	name: 'nightowl',
	description: 'Night-owl Python main. Always down for 2v2.',
	icon: 'crown',
	rating: 2046,
	gamesPlayed: 120,
	gamesWon: 78,
	gamesLost: 39,
};

export interface DemoMatch {
	result: 'W' | 'L' | 'D';
	change: number;
	ratingAfter: number;
	teamSize: number;
	playedAt: Date;
}

// Oldest first: [result, change, team size, hours before now].
const SCRIPT: ['W' | 'L' | 'D', number, number, number][] = [
	['W', 15, 1, 94],
	['L', -13, 2, 90],
	['W', 17, 3, 71],
	['W', 14, 1, 69],
	['L', -16, 2, 50],
	['D', 2, 2, 47],
	['W', 19, 1, 26],
	['L', -12, 3, 23],
	['W', 18, 2, 5],
	['W', 13, 1, 2],
];

// The demo player's 10 matches, oldest first, ending at DEMO.rating.
export function demoMatches(now: Date): DemoMatch[] {
	let rating = DEMO.rating - SCRIPT.reduce((sum, [, change]) => sum + change, 0);
	return SCRIPT.map(([result, change, teamSize, hoursAgo]) => {
		rating += change;
		return { result, change, ratingAfter: rating, teamSize, playedAt: new Date(now.getTime() - hoursAgo * 3_600_000) };
	});
}

// Creates or updates the demo user and replaces only their match history.
export async function seedDemo(now = new Date()): Promise<{ id: string; email: string; password: string }> {
	const passwordHash = await bcrypt.hash(DEMO.password, 10);
	const client = await pool.connect();
	try {
		await client.query('BEGIN');
		const user = await client.query<{ id: string }>(
			`INSERT INTO users (email, password_hash, name, description, icon, rating, games_played, games_won, games_lost)
			 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
			 ON CONFLICT (email) DO UPDATE SET password_hash = $2, name = $3, description = $4, icon = $5,
			   rating = $6, games_played = $7, games_won = $8, games_lost = $9
			 RETURNING id`,
			[DEMO.email, passwordHash, DEMO.name, DEMO.description, DEMO.icon, DEMO.rating, DEMO.gamesPlayed, DEMO.gamesWon, DEMO.gamesLost],
		);
		const id = user.rows[0].id;
		await client.query('DELETE FROM match_history WHERE user_id = $1', [id]);
		for (const match of demoMatches(now)) {
			await client.query(
				`INSERT INTO match_history (user_id, game_id, result, change, rating_after, team_size, played_at)
				 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
				[id, `demo-${match.playedAt.getTime()}`, match.result, match.change, match.ratingAfter, match.teamSize, match.playedAt],
			);
		}
		await client.query('COMMIT');
		return { id, email: DEMO.email, password: DEMO.password };
	} catch (err) {
		await client.query('ROLLBACK');
		throw err;
	} finally {
		client.release();
	}
}
