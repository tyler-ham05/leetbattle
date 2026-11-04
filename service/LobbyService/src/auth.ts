import { jwtDecrypt } from 'jose';
import type { JWTPayload } from 'jose';

export interface AuthenticatedUser {
	id: string;
	email: string;
}

export async function authenticateToken(token: unknown): Promise<AuthenticatedUser> {
	if (typeof token !== 'string' || token.length === 0) {
		throw new Error('A login token is required.');
	}

	const secret = process.env.SECRET;
	if (!secret) throw new Error('SECRET is not configured for LobbyService.');

	const { payload } = await jwtDecrypt(token, new TextEncoder().encode(secret));
	const claims = payload as JWTPayload & { id?: unknown; email?: unknown };
	if (typeof claims.id !== 'string' || typeof claims.email !== 'string') {
		throw new Error('The login token is missing account claims.');
	}

	return { id: claims.id, email: claims.email };
}
