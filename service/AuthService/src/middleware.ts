import { NextFunction, Request, Response } from 'express';
import { AUTH_COOKIE_NAME, verifyToken } from './jwt';

export interface AuthedRequest extends Request {
	userId?: string;
	userEmail?: string;
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
	const token = req.cookies?.[AUTH_COOKIE_NAME];
	if (!token) {
		res.status(401).json({ error: 'not authenticated' });
		return;
	}
	try {
		const payload = verifyToken(token);
		req.userId = payload.sub;
		req.userEmail = payload.email;
		next();
	} catch {
		res.status(401).json({ error: 'invalid or expired session' });
	}
}
