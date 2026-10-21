import { Request, Response } from 'express';

export function getRoot(_req: Request, res: Response) {
	res.json({ service: 'auth-service', message: 'Hello from auth-service' });
}

