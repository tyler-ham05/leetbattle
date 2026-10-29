// Must share a hostname with the page that's running this code (both
// "localhost", not "127.0.0.1" on one side and "localhost" on the other) --
// otherwise the browser treats auth-service as cross-site and drops the
// SameSite=Lax session cookie on every request after the initial login.
const AUTHSERVICE = process.env.NEXT_PUBLIC_AUTH_URL ?? 'http://localhost:4002';

export interface User {
	id: string;
	email: string;
	name: string | null;
	emailVerified: boolean;
	createdAt: string;
}

async function parseResponse<T>(res: Response): Promise<T> {
	const body = await res.json().catch(() => null);
	if (!res.ok) {
		throw new Error(body?.error ?? `Request failed with status ${res.status}`);
	}
	return body as T;
}

export class AuthAPIService {
	public async signup(email: string, password: string, name: string): Promise<User> {
		const res = await fetch(`${AUTHSERVICE}/auth/signup`, {
			method: 'POST',
			credentials: 'include',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ email, password, name }),
		});
		const { user } = await parseResponse<{ user: User }>(res);
		return user;
	}

	public async login(email: string, password: string): Promise<User> {
		const res = await fetch(`${AUTHSERVICE}/auth/login`, {
			method: 'POST',
			credentials: 'include',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ email, password }),
		});
		const { user } = await parseResponse<{ user: User }>(res);
		return user;
	}

	public async logout(): Promise<void> {
		await fetch(`${AUTHSERVICE}/auth/logout`, {
			method: 'POST',
			credentials: 'include',
		});
	}

	public async me(): Promise<User | null> {
		const res = await fetch(`${AUTHSERVICE}/auth/me`, {
			method: 'GET',
			credentials: 'include',
		});
		if (res.status === 401) {
			return null;
		}
		const { user } = await parseResponse<{ user: User }>(res);
		return user;
	}

	public async requestPasswordReset(email: string): Promise<void> {
		const res = await fetch(`${AUTHSERVICE}/auth/request-password-reset`, {
			method: 'POST',
			credentials: 'include',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ email }),
		});
		await parseResponse(res);
	}

	public async resetPassword(token: string, password: string): Promise<void> {
		const res = await fetch(`${AUTHSERVICE}/auth/reset-password`, {
			method: 'POST',
			credentials: 'include',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ token, password }),
		});
		await parseResponse(res);
	}

	public async verifyEmail(token: string): Promise<void> {
		const res = await fetch(`${AUTHSERVICE}/auth/verify-email`, {
			method: 'POST',
			credentials: 'include',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ token }),
		});
		await parseResponse(res);
	}

	public async resendVerification(): Promise<void> {
		const res = await fetch(`${AUTHSERVICE}/auth/resend-verification`, {
			method: 'POST',
			credentials: 'include',
		});
		await parseResponse(res);
	}

	public async changePassword(currentPassword: string, newPassword: string): Promise<void> {
		const res = await fetch(`${AUTHSERVICE}/auth/change-password`, {
			method: 'POST',
			credentials: 'include',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ currentPassword, newPassword }),
		});
		await parseResponse(res);
	}

	public async updateAccount(name: string): Promise<User> {
		const res = await fetch(`${AUTHSERVICE}/auth/account`, {
			method: 'PATCH',
			credentials: 'include',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ name }),
		});
		const { user } = await parseResponse<{ user: User }>(res);
		return user;
	}
}
