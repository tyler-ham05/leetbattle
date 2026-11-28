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
	// US-7-T-1: the player's rating, league and match record (from GET /me).
	rating?: number;
	league?: string;
	wins?: number;
	losses?: number;
	draws?: number;
	// US-7-T-5: the player card. `picture` is a data: URL, or null for the icon.
	icon?: string;
	description?: string;
	picture?: string | null;
	leagueMin?: number;
	nextLeague?: NextLeague | null;
}

// The league after the player's, and the rating it starts at (null in Platinum).
export interface NextLeague {
	name: string;
	at: number;
}

// Another player's profile from GET /users/:id: the User fields minus the private ones.
export type PublicProfile = Omit<User, 'email' | 'emailVerified'>;

// What PATCH /account can change on the profile (US-7-T-5).
export interface ProfileChange {
	icon?: string;
	description?: string;
}

export function getToken(): string | null {
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
		// AuthService signs out every session issued before the change (US-5-T-13),
		// this one included, and answers with a fresh token to stay signed in.
		const body = await parseResponse<{ token?: string } | null>(res);
		if (body?.token) setToken(body.token);
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

	// US-7-T-5: one player's public profile, or null if there is no such player.
	public async getUser(id: string): Promise<PublicProfile | null> {
		const res = await fetch(`${AUTHSERVICE}/users/${encodeURIComponent(id)}`, {
			method: 'GET',
			headers: authHeaders(),
		});
		if (res.status === 404) return null;
		const { user } = await parseResponse<{ user: PublicProfile }>(res);
		return user;
	}

	public async updateProfile(change: ProfileChange): Promise<User> {
		return this.sendProfile('PATCH', '/account', change);
	}

	// `image` is the cropped picture as a data: URL.
	public async setPicture(image: string): Promise<User> {
		return this.sendProfile('PUT', '/account/picture', { image });
	}

	public async removePicture(): Promise<User> {
		return this.sendProfile('DELETE', '/account/picture');
	}

	// A signed-in change to the caller's own profile, answered with `{ user }`.
	private async sendProfile(method: string, route: string, body?: object): Promise<User> {
		const res = await fetch(`${AUTHSERVICE}${route}`, {
			method,
			headers: { 'Content-Type': 'application/json', ...authHeaders() },
			body: body ? JSON.stringify(body) : undefined,
		});
		const { user } = await parseResponse<{ user: User }>(res);
		return user;
	}

	public async requestPasswordReset(email: string): Promise<void> {
		const res = await fetch(`${AUTHSERVICE}/password/forgot`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ email }),
		});
		await parseResponse(res);
	}

	public async resetPassword(token: string, newPassword: string): Promise<void> {
		const res = await fetch(`${AUTHSERVICE}/password/reset`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ token, newPassword }),
		});
		await parseResponse(res);
	}
}
