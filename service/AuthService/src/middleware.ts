import { NextFunction, Request, Response } from 'express';
import { decryptJwe } from './utils/jwe';

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

	try {
		const payload = await decryptJwe(header.slice('Bearer '.length));
		req.userId = payload.id;
		req.userEmail = payload.email;
		next();
	} catch {
		res.status(401).json({ error: 'invalid or expired session' });
	}
}
