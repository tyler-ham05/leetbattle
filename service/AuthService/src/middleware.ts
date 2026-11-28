import { timingSafeEqual } from 'node:crypto';
import { NextFunction, Request, Response } from 'express';
import { pool } from './db';
import { decryptJwe } from './utils/jwe';
import { RateLimiter } from './utils/rate-limit';

export { resetRateLimits } from './utils/rate-limit';

export interface AuthedRequest extends Request {
	userId?: string;
	userEmail?: string;
}

export async function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
	const header = req.headers.authorization;
	if (!header?.startsWith('Bearer ')) {
		res.status(401).json({ error: 'not authenticated' });
		return;
	}

	let issuedAt: number;
	try {
		const payload = await decryptJwe(header.slice('Bearer '.length));
		req.userId = payload.id;
		req.userEmail = payload.email;
		issuedAt = payload.iat ?? 0;
	} catch {
		res.status(401).json({ error: 'invalid or expired session' });
		return;
	}

	// US-5-T-13: a password reset or change signs out every session issued
	// before it. `iat` is in whole seconds, so the change time is rounded down
	// too; otherwise the fresh token from a change would be signed out by it.
	try {
		const result = await pool.query<{ password_changed_at: Date | null }>(
			'SELECT password_changed_at FROM users WHERE id = $1',
			[req.userId],
		);
		const changedAt = result.rows[0]?.password_changed_at;
		if (changedAt && issuedAt < Math.floor(changedAt.getTime() / 1000)) {
			res.status(401).json({ error: 'invalid or expired session' });
			return;
		}
		next();
	} catch (err) {
		next(err);
	}
}

// US-5-T-13: answers 429 once one IP has made `max` requests in `windowMs`.
export function limitByIp(max: number, windowMs: number) {
	const limiter = new RateLimiter(max, windowMs);
	return (req: Request, res: Response, next: NextFunction) => {
		if (!limiter.hit(req.ip ?? '')) {
			res.status(429).json({ error: 'too many requests, please try again later' });
			return;
		}
		next();
	};
}

// US-7-T-1: only another backend service (GameService) may report match
// results. It proves it by sending INTERNAL_API_KEY, which never reaches a
// browser; a player's login token is not enough. With no key configured,
// every request is refused.
export function requireInternalKey(req: Request, res: Response, next: NextFunction) {
	const expected = process.env.INTERNAL_API_KEY;
	const header = req.headers.authorization ?? '';
	const sent = header.startsWith('Bearer ') ? header.slice('Bearer '.length) : '';
	const matches = expected !== undefined && expected !== ''
		&& sent.length === expected.length
		&& timingSafeEqual(Buffer.from(sent), Buffer.from(expected));
	if (!matches) {
		res.status(401).json({ error: 'not authorized' });
		return;
	}
	next();
}
