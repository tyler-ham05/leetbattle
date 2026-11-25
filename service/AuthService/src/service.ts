import bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'node:crypto';
import { NextFunction, Request, Response } from 'express';
import { pool } from './db';
import { encryptJwe } from './utils/jwe';
import { AuthedRequest } from './middleware';
import { mailer } from './utils/mailer';
import { RateLimiter } from './utils/rate-limit';
import { leagueFor, rateMatch, STARTING_RATING } from './utils/rating';
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
}

function toPublicUser(user: UserRow) {
	return {
		id: user.id,
		email: user.email,
		name: user.name,
		emailVerified: user.email_verified,
		createdAt: user.created_at,
		// US-7-T-1: the player's rating, league and match record.
		rating: user.rating,
		league: leagueFor(user.rating),
		wins: user.games_won ?? 0,
		losses: user.games_lost,
		draws: (user.games_played ?? 0) - (user.games_won ?? 0) - user.games_lost,
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
			 RETURNING id, email, password_hash, name, created_at, rating, games_played, games_won, games_lost`,
			[email, passwordHash, typeof name === 'string' ? name : null],
		);
		const user = result.rows[0];

		const token = await encryptJwe(user.id, user.email);
		res.status(201).json({ user: toPublicUser(user), token });
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
		res.json({ user: toPublicUser(user), token });
	} catch (err) {
		next(err);
	}
}

// Stateless JWE sessions have nothing server-side to invalidate; the client just
// discards its token. Kept as a route for API symmetry.
export function logout(_req: Request, res: Response) {
	res.status(204).send();
}

export async function me(req: AuthedRequest, res: Response, next: NextFunction) {
	try {
		const result = await pool.query<UserRow>('SELECT * FROM users WHERE id = $1', [req.userId]);
		const user = result.rows[0];
		if (!user) {
			res.status(401).json({ error: 'not authenticated' });
			return;
		}
		res.json({ user: toPublicUser(user) });
	} catch (err) {
		next(err);
	}
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

export async function updateAccount(req: AuthedRequest, res: Response, next: NextFunction) {
	const { name } = req.body ?? {};
	if (typeof name !== 'string' || name.trim().length === 0) {
		res.status(400).json({ error: 'name is required' });
		return;
	}

	try {
		const result = await pool.query<UserRow>(
			`UPDATE users SET name = $1 WHERE id = $2
			 RETURNING id, email, password_hash, name, email_verified, created_at, rating, games_played, games_won, games_lost`,
			[name.trim(), req.userId],
		);
		const user = result.rows[0];
		if (!user) {
			res.status(401).json({ error: 'not authenticated' });
			return;
		}
		res.json({ user: toPublicUser(user) });
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
		&& players.every((player: ReportedPlayer) => isUuid(player?.userId) && isTeam(player?.team));
	if (!valid) {
		res.status(400).json({ error: 'gameId, winner (a, b or null) and players are required' });
		return;
	}
	const reported = players as ReportedPlayer[];

	const client = await pool.connect();
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
