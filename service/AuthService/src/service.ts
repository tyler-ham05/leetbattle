import bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'node:crypto';
import { NextFunction, Request, Response } from 'express';
import type { PoolClient } from 'pg';
import { pool } from './db';
import { encryptJwe } from './utils/jwe';
import { AuthedRequest } from './middleware';
import { mailer } from './utils/mailer';
import { RateLimiter } from './utils/rate-limit';
import { leagueFor, leagueMinFor, nextLeagueFor, rateMatch, STARTING_RATING } from './utils/rating';
import { cleanDescription, isIcon, parsePicture, pictureUrl } from './utils/profile';
import type { TeamId } from './utils/rating';

const RESET_TOKEN_MINUTES = 30;

// US-5-T-13: at most 3 reset emails an hour to one address.
const resetEmails = new RateLimiter(3, 60 * 60_000);

// US-5-T-13: emails are compared and stored without regard to case or
// surrounding spaces, so "Ada@x.com " and "ada@x.com" are the same account.
function normalizeEmail(email: string): string {
	return email.trim().toLowerCase();
}

// Only the hash of a reset token is stored, so a leaked table cannot be used to reset passwords.
function hashResetToken(token: string): string {
	return createHash('sha256').update(token).digest('hex');
}

interface UserRow {
	id: string;
	email: string;
	password_hash: string;
	name: string | null;
	email_verified: boolean;
	created_at: Date;
	rating: number;
	games_played: number | null;
	games_won: number | null;
	games_lost: number;
	icon: string;
	description: string;
	picture: Buffer | null;
	picture_type: string | null;
}

interface MatchRow {
	result: 'W' | 'L' | 'D';
	change: number;
	rating_after: number;
	team_size: number;
	played_at: Date;
}

// US-7-T-5: the player's last 10 matches, oldest first, for the profile's
// rating chart. One query per profile response.
async function recentMatchesOf(userId: string) {
	const result = await pool.query<MatchRow>(
		`SELECT * FROM (
			SELECT id, result, change, rating_after, team_size, played_at FROM match_history
			WHERE user_id = $1 ORDER BY played_at DESC, id DESC LIMIT 10
		 ) recent ORDER BY played_at, id`,
		[userId],
	);
	return result.rows.map((row) => ({
		result: row.result,
		change: row.change,
		ratingAfter: row.rating_after,
		teamSize: row.team_size,
		playedAt: row.played_at.toISOString(),
	}));
}

// US-7-T-5: what anyone signed in may see of a player (never their email).
async function toPublicProfile(user: UserRow) {
	return {
		id: user.id,
		name: user.name,
		// What to show for the player: their name, or (like the lobby and queue) the
		// part of their email before the @. Never the whole email.
		displayName: user.name?.trim() || user.email.split('@')[0],
		icon: user.icon,
		description: user.description,
		picture: pictureUrl(user.picture, user.picture_type),
		createdAt: user.created_at,
		// US-7-T-1: the player's rating, league and match record.
		rating: user.rating,
		league: leagueFor(user.rating),
		leagueMin: leagueMinFor(user.rating),
		nextLeague: nextLeagueFor(user.rating),
		wins: user.games_won ?? 0,
		losses: user.games_lost,
		draws: (user.games_played ?? 0) - (user.games_won ?? 0) - user.games_lost,
		recentMatches: await recentMatchesOf(user.id),
	};
}

// The signed-in player's own profile: the public one plus their email.
async function toPublicUser(user: UserRow) {
	return {
		...(await toPublicProfile(user)),
		email: user.email,
		emailVerified: user.email_verified,
	};
}

export function getRoot(_req: Request, res: Response) {
	res.json({ service: 'auth-service', message: 'Hello from auth-service' });
}

export async function signup(req: Request, res: Response, next: NextFunction) {
	const { password, name } = req.body ?? {};
	const email = typeof req.body?.email === 'string' ? normalizeEmail(req.body.email) : undefined;
	if (typeof email !== 'string' || !email.includes('@')) {
		res.status(400).json({ error: 'a valid email is required' });
		return;
	}
	if (typeof password !== 'string' || password.length < 8) {
		res.status(400).json({ error: 'password must be at least 8 characters' });
		return;
	}

	try {
		const existing = await pool.query('SELECT id FROM users WHERE lower(email) = $1', [email]);
		if (existing.rows.length > 0) {
			res.status(409).json({ error: 'an account with that email already exists' });
			return;
		}

		const passwordHash = await bcrypt.hash(password, 10);
		const result = await pool.query<UserRow>(
			`INSERT INTO users (email, password_hash, name)
			 VALUES ($1, $2, $3)
			 RETURNING *`,
			[email, passwordHash, typeof name === 'string' ? name : null],
		);
		const user = result.rows[0];

		const token = await encryptJwe(user.id, user.email);
		res.status(201).json({ user: await toPublicUser(user), token });
	} catch (err) {
		next(err);
	}
}

export async function login(req: Request, res: Response, next: NextFunction) {
	const { email, password } = req.body ?? {};
	if (typeof email !== 'string' || typeof password !== 'string') {
		res.status(400).json({ error: 'email and password are required' });
		return;
	}

	try {
		const result = await pool.query<UserRow>('SELECT * FROM users WHERE lower(email) = $1', [normalizeEmail(email)]);
		const user = result.rows[0];
		if (!user || !(await bcrypt.compare(password, user.password_hash))) {
			res.status(401).json({ error: 'invalid email or password' });
			return;
		}

		const token = await encryptJwe(user.id, user.email);
		res.json({ user: await toPublicUser(user), token });
	} catch (err) {
		next(err);
	}
}

// Stateless JWE sessions have nothing server-side to invalidate; the client just
// discards its token. Kept as a route for API symmetry.
export function logout(_req: Request, res: Response) {
	res.status(204).send();
}

// Runs a query for the signed-in player's row and answers with their own
// profile, or 401 when the account no longer exists.
async function sendOwnUser(res: Response, next: NextFunction, sql: string, params: unknown[]) {
	try {
		const result = await pool.query<UserRow>(sql, params);
		const user = result.rows[0];
		if (!user) {
			res.status(401).json({ error: 'not authenticated' });
			return;
		}
		res.json({ user: await toPublicUser(user) });
	} catch (err) {
		next(err);
	}
}

export async function me(req: AuthedRequest, res: Response, next: NextFunction) {
	await sendOwnUser(res, next, 'SELECT * FROM users WHERE id = $1', [req.userId]);
}

export async function changePassword(req: AuthedRequest, res: Response, next: NextFunction) {
	const { currentPassword, newPassword } = req.body ?? {};
	if (typeof currentPassword !== 'string' || typeof newPassword !== 'string' || newPassword.length < 8) {
		res.status(400).json({ error: 'current password and a new password of at least 8 characters are required' });
		return;
	}

	try {
		const result = await pool.query<UserRow>('SELECT * FROM users WHERE id = $1', [req.userId]);
		const user = result.rows[0];
		if (!user || !(await bcrypt.compare(currentPassword, user.password_hash))) {
			res.status(401).json({ error: 'current password is incorrect' });
			return;
		}

		const passwordHash = await bcrypt.hash(newPassword, 10);
		// US-5-T-13: signs out every older session, including the one making
		// this change, so it gets a fresh token. The time comes from this
		// process, the same clock the token's issued-at time does.
		await pool.query(
			'UPDATE users SET password_hash = $1, password_changed_at = $2 WHERE id = $3',
			[passwordHash, new Date(), user.id],
		);
		const token = await encryptJwe(user.id, user.email);
		res.json({ message: 'password has been changed', token });
	} catch (err) {
		next(err);
	}
}

// Saves `changes` (column -> value, columns named only by this file) on the
// signed-in player only and answers with their updated profile.
async function saveOwnProfile(req: AuthedRequest, res: Response, next: NextFunction, changes: Record<string, unknown>) {
	const columns = Object.keys(changes);
	const assignments = columns.map((column, i) => `${column} = $${i + 2}`).join(', ');
	await sendOwnUser(
		res,
		next,
		`UPDATE users SET ${assignments} WHERE id = $1 RETURNING *`,
		[req.userId, ...columns.map((column) => changes[column])],
	);
}

// The column changes a PATCH /account body asks for, or an error message.
function accountChanges(body: Record<string, unknown>): Record<string, unknown> | string {
	const { name, icon, description } = body;
	if (name === undefined && icon === undefined && description === undefined) {
		return 'name, icon or description is required';
	}
	const changes: Record<string, unknown> = {};
	if (name !== undefined) {
		if (typeof name !== 'string' || name.trim().length === 0) return 'name is required';
		changes.name = name.trim();
	}
	if (icon !== undefined) {
		if (!isIcon(icon)) return 'icon must be one of the preset icons';
		changes.icon = icon;
	}
	if (description !== undefined) {
		const cleaned = cleanDescription(description);
		if (cleaned === null) return 'description must be at most 80 characters';
		changes.description = cleaned;
	}
	return changes;
}

// US-7-T-5: name, icon and description are each optional, but at least one
// is needed. Any id in the body is ignored: the account is the token's.
export async function updateAccount(req: AuthedRequest, res: Response, next: NextFunction) {
	const changes = accountChanges(req.body ?? {});
	if (typeof changes === 'string') {
		res.status(400).json({ error: changes });
		return;
	}
	await saveOwnProfile(req, res, next, changes);
}

// US-7-T-5: stores the signed-in player's picture, checked by its bytes.
export async function setPicture(req: AuthedRequest, res: Response, next: NextFunction) {
	const picture = parsePicture(req.body?.image);
	if (!picture) {
		res.status(400).json({ error: 'image must be a PNG, JPEG or WebP of at most 200 KB' });
		return;
	}
	await saveOwnProfile(req, res, next, { picture: picture.bytes, picture_type: picture.type });
}

// US-7-T-5: removes the signed-in player's picture, so their icon shows again.
export async function removePicture(req: AuthedRequest, res: Response, next: NextFunction) {
	await saveOwnProfile(req, res, next, { picture: null, picture_type: null });
}

// US-7-T-5: another player's public profile. A malformed id is a 404, like a missing one.
export async function getUser(req: AuthedRequest, res: Response, next: NextFunction) {
	if (!isUuid(req.params.id)) {
		res.status(404).json({ error: 'player not found' });
		return;
	}
	try {
		const result = await pool.query<UserRow>('SELECT * FROM users WHERE id = $1', [req.params.id]);
		const user = result.rows[0];
		if (!user) {
			res.status(404).json({ error: 'player not found' });
			return;
		}
		res.json({ user: await toPublicProfile(user) });
	} catch (err) {
		next(err);
	}
}

// Starts a password reset. Always answers the same way, whether or not the
// email has an account, so the endpoint cannot be used to find registered emails.
export async function forgotPassword(req: Request, res: Response, next: NextFunction) {
	const { email } = req.body ?? {};
	if (typeof email !== 'string' || !email.includes('@')) {
		res.status(400).json({ error: 'a valid email is required' });
		return;
	}

	try {
		const address = normalizeEmail(email);
		// Counted whether or not the account exists, so the limit gives nothing away.
		const withinLimit = resetEmails.hit(address);
		const result = await pool.query<UserRow>('SELECT * FROM users WHERE lower(email) = $1', [address]);
		const user = result.rows[0];
		if (user && withinLimit) {
			const token = randomBytes(32).toString('hex');
			// A new link replaces any earlier one for the same account.
			await pool.query('DELETE FROM password_resets WHERE user_id = $1', [user.id]);
			await pool.query(
				`INSERT INTO password_resets (token_hash, user_id, expires_at)
				 VALUES ($1, $2, now() + make_interval(mins => $3))`,
				[hashResetToken(token), user.id, RESET_TOKEN_MINUTES],
			);
			const frontend = (process.env.FRONTEND_URL ?? 'http://localhost:3000').split(',')[0].trim();
			// Not awaited, and a failure is only logged: a slow or failing email
			// must not make this answer differ from the one for an unknown email.
			void mailer.sendPasswordReset(user.email, `${frontend}/login/reset?token=${token}`).catch((err: unknown) => {
				console.error('[auth-service] could not send password reset email', err);
			});
		}
		res.json({ message: 'if an account exists for that email, a reset link has been sent' });
	} catch (err) {
		next(err);
	}
}

// Finishes a password reset: the token from the emailed link buys one password change.
export async function resetPassword(req: Request, res: Response, next: NextFunction) {
	const { token, newPassword } = req.body ?? {};
	if (typeof token !== 'string' || typeof newPassword !== 'string' || newPassword.length < 8) {
		res.status(400).json({ error: 'a reset token and a new password of at least 8 characters are required' });
		return;
	}

	try {
		// One statement uses up the link and sets the password, so a failure
		// cannot spend the link without changing the password. Deleting the
		// row is what makes the link single-use.
		const passwordHash = await bcrypt.hash(newPassword, 10);
		const result = await pool.query(
			`WITH used AS (
				DELETE FROM password_resets WHERE token_hash = $1 AND expires_at > now() RETURNING user_id
			 )
			 UPDATE users SET password_hash = $2, password_changed_at = $3 FROM used WHERE users.id = used.user_id
			 RETURNING users.id`,
			// US-5-T-13: signs out every session issued before the reset.
			[hashResetToken(token), passwordHash, new Date()],
		);
		if (result.rows.length === 0) {
			res.status(400).json({ error: 'this reset link is invalid or has expired' });
			return;
		}
		res.json({ message: 'password has been changed' });
	} catch (err) {
		next(err);
	}
}

interface ReportedPlayer {
	userId: string;
	team: TeamId;
}

const isTeam = (value: unknown): value is TeamId => value === 'a' || value === 'b';
const isUuid = (value: unknown) => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

// US-7-T-1: GameService reports a finished match. Every player's new rating
// is worked out from the ratings before the match, then all of them (and
// their win/loss/draw records) are saved together in one transaction.
export async function reportMatchResult(req: Request, res: Response, next: NextFunction) {
	const { gameId, winner, players } = req.body ?? {};
	const valid = typeof gameId === 'string'
		&& (winner === null || isTeam(winner))
		&& Array.isArray(players) && players.length > 0
		&& players.every((player: ReportedPlayer) => isUuid(player?.userId) && isTeam(player?.team))
		// Both teams need players, or the opponents' average rating is 0/0.
		&& players.some((player: ReportedPlayer) => player.team === 'a')
		&& players.some((player: ReportedPlayer) => player.team === 'b');
	if (!valid) {
		res.status(400).json({ error: 'gameId, winner (a, b or null) and players are required' });
		return;
	}
	const reported = players as ReportedPlayer[];

	// A database that can't be reached is a 500, not a hung request.
	let client: PoolClient;
	try {
		client = await pool.connect();
	} catch (err) {
		next(err);
		return;
	}
	try {
		await client.query('BEGIN');
		const found = await client.query<{ id: string; rating: number }>(
			'SELECT id, rating FROM users WHERE id = ANY($1::uuid[]) FOR UPDATE',
			[reported.map((player) => player.userId)],
		);
		const ratings = new Map(found.rows.map((row) => [row.id, row.rating]));
		// A player AuthService doesn't know still counts at the starting
		// rating for their team's average, but isn't saved.
		const teams = new Map(reported.map((player) => [player.userId, player.team]));
		const teamSize = (team: TeamId | undefined) => reported.filter((player) => player.team === team).length;
		const changes = rateMatch(
			reported.map((player) => ({ ...player, rating: ratings.get(player.userId) ?? STARTING_RATING })),
			winner,
		).filter((change) => ratings.has(change.userId));
		for (const change of changes) {
			const team = teams.get(change.userId);
			const won = winner !== null && team === winner;
			const lost = winner !== null && team !== winner;
			await client.query(
				`UPDATE users SET rating = $2,
				   games_played = COALESCE(games_played, 0) + 1,
				   games_won = COALESCE(games_won, 0) + $3,
				   games_lost = games_lost + $4
				 WHERE id = $1`,
				[change.userId, change.newRating, won ? 1 : 0, lost ? 1 : 0],
			);
			// US-7-T-5: the match as this player saw it, for their rating chart.
			await client.query(
				`INSERT INTO match_history (user_id, game_id, result, change, rating_after, team_size)
				 VALUES ($1, $2, $3, $4, $5, $6)`,
				[change.userId, gameId, won ? 'W' : lost ? 'L' : 'D', change.change, change.newRating, teamSize(team)],
			);
		}
		await client.query('COMMIT');
		res.json({ players: changes });
	} catch (err) {
		await client.query('ROLLBACK');
		next(err);
	} finally {
		client.release();
	}
}
