import * as crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { Request, Response } from 'express';
import { pool } from './db';
import { AUTH_COOKIE_MAX_AGE_MS, AUTH_COOKIE_NAME, signToken } from './jwt';
import { sendMail } from './mailer';
import { AuthedRequest } from './middleware';

const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:3000';
const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;
const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;

interface UserRow {
	id: string;
	email: string;
	password_hash: string;
	name: string | null;
	email_verified: boolean;
	created_at: Date;
}

function toPublicUser(user: UserRow) {
	return {
		id: user.id,
		email: user.email,
		name: user.name,
		emailVerified: user.email_verified,
		createdAt: user.created_at,
	};
}

// In production, frontend and auth-service are deployed as separate Cloud
// Run services on different *.run.app domains, which is cross-site. A cookie
// that survives that needs SameSite=None, which in turn requires Secure
// (browsers refuse SameSite=None without it) -- both of which Cloud Run's
// HTTPS satisfies. Locally everything shares "localhost", so the stricter
// Lax/non-Secure combination works and doesn't require HTTPS.
const isProduction = process.env.NODE_ENV === 'production';

function setAuthCookie(res: Response, userId: string, email: string) {
	const token = signToken({ sub: userId, email });
	res.cookie(AUTH_COOKIE_NAME, token, {
		httpOnly: true,
		sameSite: isProduction ? 'none' : 'lax',
		secure: isProduction,
		maxAge: AUTH_COOKIE_MAX_AGE_MS,
	});
}

export function getRoot(_req: Request, res: Response) {
	res.json({ service: 'auth-service', message: 'Hello from auth-service' });
}

export async function signup(req: Request, res: Response) {
	const { email, password, name } = req.body ?? {};
	if (typeof email !== 'string' || !email.includes('@')) {
		res.status(400).json({ error: 'a valid email is required' });
		return;
	}
	if (typeof password !== 'string' || password.length < 8) {
		res.status(400).json({ error: 'password must be at least 8 characters' });
		return;
	}

	try {
		const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
		if (existing.rows.length > 0) {
			res.status(409).json({ error: 'an account with that email already exists' });
			return;
		}

		const passwordHash = await bcrypt.hash(password, 10);
		const result = await pool.query<UserRow>(
			`INSERT INTO users (email, password_hash, name)
			 VALUES ($1, $2, $3)
			 RETURNING id, email, password_hash, name, email_verified, created_at`,
			[email, passwordHash, typeof name === 'string' ? name : null],
		);
		const user = result.rows[0];

		const token = crypto.randomBytes(32).toString('hex');
		const expiresAt = new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS);
		await pool.query(
			'INSERT INTO email_verification_tokens (token, user_id, expires_at) VALUES ($1, $2, $3)',
			[token, user.id, expiresAt],
		);
		sendMail(
			user.email,
			'Verify your LeetBattle email',
			`Click to verify your email: ${FRONTEND_URL}/verify-email?token=${token}`,
		);

		setAuthCookie(res, user.id, user.email);
		res.status(201).json({ user: toPublicUser(user) });
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: 'failed to create account' });
	}
}

export async function login(req: Request, res: Response) {
	const { email, password } = req.body ?? {};
	if (typeof email !== 'string' || typeof password !== 'string') {
		res.status(400).json({ error: 'email and password are required' });
		return;
	}

	try {
		const result = await pool.query<UserRow>('SELECT * FROM users WHERE email = $1', [email]);
		const user = result.rows[0];
		if (!user || !(await bcrypt.compare(password, user.password_hash))) {
			res.status(401).json({ error: 'invalid email or password' });
			return;
		}

		setAuthCookie(res, user.id, user.email);
		res.json({ user: toPublicUser(user) });
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: 'failed to log in' });
	}
}

export function logout(_req: Request, res: Response) {
	res.clearCookie(AUTH_COOKIE_NAME, {
		httpOnly: true,
		sameSite: isProduction ? 'none' : 'lax',
		secure: isProduction,
	});
	res.status(204).send();
}

export async function me(req: AuthedRequest, res: Response) {
	try {
		const result = await pool.query<UserRow>('SELECT * FROM users WHERE id = $1', [req.userId]);
		const user = result.rows[0];
		if (!user) {
			res.status(401).json({ error: 'not authenticated' });
			return;
		}
		res.json({ user: toPublicUser(user) });
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: 'failed to fetch account' });
	}
}

export async function requestPasswordReset(req: Request, res: Response) {
	const { email } = req.body ?? {};
	if (typeof email !== 'string') {
		res.status(400).json({ error: 'email is required' });
		return;
	}

	try {
		const result = await pool.query<UserRow>('SELECT * FROM users WHERE email = $1', [email]);
		const user = result.rows[0];
		// Always respond the same way whether or not the account exists, so
		// this endpoint can't be used to enumerate registered emails.
		if (user) {
			const token = crypto.randomBytes(32).toString('hex');
			const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MS);
			await pool.query(
				'INSERT INTO password_reset_tokens (token, user_id, expires_at) VALUES ($1, $2, $3)',
				[token, user.id, expiresAt],
			);
			sendMail(
				user.email,
				'Reset your LeetBattle password',
				`Click to reset your password: ${FRONTEND_URL}/reset-password?token=${token}`,
			);
		}
		res.json({ message: 'if that email has an account, a reset link has been sent' });
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: 'failed to request password reset' });
	}
}

export async function resetPassword(req: Request, res: Response) {
	const { token, password } = req.body ?? {};
	if (typeof token !== 'string' || typeof password !== 'string' || password.length < 8) {
		res.status(400).json({ error: 'a token and a password of at least 8 characters are required' });
		return;
	}

	try {
		const result = await pool.query(
			'SELECT user_id, expires_at FROM password_reset_tokens WHERE token = $1',
			[token],
		);
		const row = result.rows[0];
		if (!row || new Date(row.expires_at) < new Date()) {
			res.status(400).json({ error: 'reset link is invalid or has expired' });
			return;
		}

		const passwordHash = await bcrypt.hash(password, 10);
		await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, row.user_id]);
		await pool.query('DELETE FROM password_reset_tokens WHERE token = $1', [token]);
		res.json({ message: 'password has been reset' });
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: 'failed to reset password' });
	}
}

export async function verifyEmail(req: Request, res: Response) {
	const { token } = req.body ?? {};
	if (typeof token !== 'string') {
		res.status(400).json({ error: 'token is required' });
		return;
	}

	try {
		const result = await pool.query(
			'SELECT user_id, expires_at FROM email_verification_tokens WHERE token = $1',
			[token],
		);
		const row = result.rows[0];
		if (!row || new Date(row.expires_at) < new Date()) {
			res.status(400).json({ error: 'verification link is invalid or has expired' });
			return;
		}

		await pool.query('UPDATE users SET email_verified = TRUE WHERE id = $1', [row.user_id]);
		await pool.query('DELETE FROM email_verification_tokens WHERE token = $1', [token]);
		res.json({ message: 'email has been verified' });
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: 'failed to verify email' });
	}
}

export async function resendVerification(req: AuthedRequest, res: Response) {
	try {
		const result = await pool.query<UserRow>('SELECT * FROM users WHERE id = $1', [req.userId]);
		const user = result.rows[0];
		if (!user) {
			res.status(401).json({ error: 'not authenticated' });
			return;
		}
		if (user.email_verified) {
			res.json({ message: 'email is already verified' });
			return;
		}

		const token = crypto.randomBytes(32).toString('hex');
		const expiresAt = new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS);
		await pool.query(
			'INSERT INTO email_verification_tokens (token, user_id, expires_at) VALUES ($1, $2, $3)',
			[token, user.id, expiresAt],
		);
		sendMail(
			user.email,
			'Verify your LeetBattle email',
			`Click to verify your email: ${FRONTEND_URL}/verify-email?token=${token}`,
		);
		res.json({ message: 'verification email sent' });
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: 'failed to resend verification email' });
	}
}

export async function changePassword(req: AuthedRequest, res: Response) {
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
		await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, user.id]);
		res.json({ message: 'password has been changed' });
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: 'failed to change password' });
	}
}

export async function updateAccount(req: AuthedRequest, res: Response) {
	const { name } = req.body ?? {};
	if (typeof name !== 'string' || name.trim().length === 0) {
		res.status(400).json({ error: 'name is required' });
		return;
	}

	try {
		const result = await pool.query<UserRow>(
			`UPDATE users SET name = $1 WHERE id = $2
			 RETURNING id, email, password_hash, name, email_verified, created_at`,
			[name.trim(), req.userId],
		);
		const user = result.rows[0];
		if (!user) {
			res.status(401).json({ error: 'not authenticated' });
			return;
		}
		res.json({ user: toPublicUser(user) });
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: 'failed to update account' });
	}
}
