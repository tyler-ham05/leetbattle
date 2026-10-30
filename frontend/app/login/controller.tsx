// auth-service issues a JWE session token in the response body instead of a cookie,
// so this is a bearer-token client: the token is cached client-side and sent back
// as an Authorization header on every request that needs it.
const AUTHSERVICE = process.env.NEXT_PUBLIC_AUTH_URL ?? 'http://localhost:4002';
const TOKEN_STORAGE_KEY = 'authToken';

export interface User {
	id: string;
	email: string;
	name: string | null;
	emailVerified: boolean;
	createdAt: string;
}

function getToken(): string | null {
	try {
		return localStorage.getItem(TOKEN_STORAGE_KEY);
	} catch {
		return null;
	}
}

function setToken(token: string): void {
	try {
		localStorage.setItem(TOKEN_STORAGE_KEY, token);
	} catch {
		// Ignore storage failures (e.g. private browsing) -- the session just
		// won't survive a reload.
	}
}

function clearToken(): void {
	try {
		localStorage.removeItem(TOKEN_STORAGE_KEY);
	} catch {
		// Nothing to clean up if storage isn't available.
	}
}

function authHeaders(): HeadersInit {
	const token = getToken();
	return token ? { Authorization: `Bearer ${token}` } : {};
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
		const res = await fetch(`${AUTHSERVICE}/signup`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ email, password, name }),
		});
		const { user, token } = await parseResponse<{ user: User; token: string }>(res);
		setToken(token);
		return user;
	}

	public async login(email: string, password: string): Promise<User> {
		const res = await fetch(`${AUTHSERVICE}/login`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ email, password }),
		});
		const { user, token } = await parseResponse<{ user: User; token: string }>(res);
		setToken(token);
		return user;
	}

	public async logout(): Promise<void> {
		clearToken();
		await fetch(`${AUTHSERVICE}/logout`, { method: 'POST' });
	}

	public async me(): Promise<User | null> {
		if (!getToken()) {
			return null;
		}

		const res = await fetch(`${AUTHSERVICE}/me`, {
			method: 'GET',
			headers: authHeaders(),
		});
		if (res.status === 401) {
			clearToken();
			return null;
		}
		const { user } = await parseResponse<{ user: User }>(res);
		return user;
	}

	public async changePassword(currentPassword: string, newPassword: string): Promise<void> {
		const res = await fetch(`${AUTHSERVICE}/password`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json', ...authHeaders() },
			body: JSON.stringify({ currentPassword, newPassword }),
		});
		await parseResponse(res);
	}

	public async updateAccount(name: string): Promise<User> {
		const res = await fetch(`${AUTHSERVICE}/account`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json', ...authHeaders() },
			body: JSON.stringify({ name }),
		});
		const { user } = await parseResponse<{ user: User }>(res);
		return user;
	}
}
