import bcrypt from 'bcryptjs';
import { NextFunction, Request, Response } from 'express';
import { pool } from './db';
import { encryptJwe } from './utils/jwe';
import { AuthedRequest } from './middleware';

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

export function getRoot(_req: Request, res: Response) {
	res.json({ service: 'auth-service', message: 'Hello from auth-service' });
}

export async function signup(req: Request, res: Response, next: NextFunction) {
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
			 RETURNING id, email, password_hash, name, created_at`,
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
		const result = await pool.query<UserRow>('SELECT * FROM users WHERE email = $1', [email]);
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
		await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, user.id]);
		res.json({ message: 'password has been changed' });
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
		next(err);
	}
}
