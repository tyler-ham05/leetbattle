import { describe, expect, it } from 'vitest';
import { request } from './setup';
import { pool } from '../src/db';

describe('GET /', () => {
	it('returns a welcome message', async () => {
		const res = await request.get('/');
		expect(res.status).toBe(200);
		expect(res.body.service).toBe('auth-service');
	});
});

describe('signup / login / me / logout', () => {
	const email = 'signup-flow@example.com';
	const password = 'correct-horse-battery-staple';

	it('signs up a new user and sets a session cookie', async () => {
		const res = await request
			.post('/auth/signup')
			.send({ email, password, name: 'Test User' });
		expect(res.status).toBe(201);
		expect(res.body.user.email).toBe(email);
		expect(res.body.user.emailVerified).toBe(false);
		expect(res.headers['set-cookie']?.[0]).toMatch(/auth_token=/);
	});

	it('rejects a duplicate signup', async () => {
		const res = await request
			.post('/auth/signup')
			.send({ email, password, name: 'Test User' });
		expect(res.status).toBe(409);
	});

	it('rejects login with the wrong password', async () => {
		const res = await request
			.post('/auth/login')
			.send({ email, password: 'wrong-password' });
		expect(res.status).toBe(401);
	});

	it('logs in with the right credentials and reaches /auth/me', async () => {
		const agent = request;
		const loginRes = await agent.post('/auth/login').send({ email, password });
		expect(loginRes.status).toBe(200);
		const cookie = loginRes.headers['set-cookie'];

		const meRes = await agent.get('/auth/me').set('Cookie', cookie);
		expect(meRes.status).toBe(200);
		expect(meRes.body.user.email).toBe(email);
	});

	it('rejects /auth/me without a session', async () => {
		const res = await request.get('/auth/me');
		expect(res.status).toBe(401);
	});

	it('clears the session on logout', async () => {
		const loginRes = await request.post('/auth/login').send({ email, password });
		const cookie = loginRes.headers['set-cookie'];

		const logoutRes = await request.post('/auth/logout').set('Cookie', cookie);
		expect(logoutRes.status).toBe(204);
	});
});

describe('email verification', () => {
	const email = 'verify-flow@example.com';
	const password = 'correct-horse-battery-staple';

	it('verifies an email with the token issued at signup', async () => {
		await request.post('/auth/signup').send({ email, password });

		const tokenRow = await pool.query(
			'SELECT token FROM email_verification_tokens t JOIN users u ON u.id = t.user_id WHERE u.email = $1',
			[email],
		);
		expect(tokenRow.rows.length).toBe(1);

		const res = await request
			.post('/auth/verify-email')
			.send({ token: tokenRow.rows[0].token });
		expect(res.status).toBe(200);

		const meRes = await request.post('/auth/login').send({ email, password });
		expect(meRes.body.user.emailVerified).toBe(true);
	});

	it('rejects an unknown verification token', async () => {
		const res = await request.post('/auth/verify-email').send({ token: 'not-a-real-token' });
		expect(res.status).toBe(400);
	});
});

describe('password reset', () => {
	const email = 'reset-flow@example.com';
	const password = 'correct-horse-battery-staple';
	const newPassword = 'a-totally-different-password';

	it('resets a password with a valid token', async () => {
		await request.post('/auth/signup').send({ email, password });
		await request.post('/auth/request-password-reset').send({ email });

		const tokenRow = await pool.query(
			'SELECT token FROM password_reset_tokens t JOIN users u ON u.id = t.user_id WHERE u.email = $1',
			[email],
		);
		expect(tokenRow.rows.length).toBe(1);

		const resetRes = await request
			.post('/auth/reset-password')
			.send({ token: tokenRow.rows[0].token, password: newPassword });
		expect(resetRes.status).toBe(200);

		const loginRes = await request.post('/auth/login').send({ email, password: newPassword });
		expect(loginRes.status).toBe(200);
	});

	it('does not reveal whether an email is registered', async () => {
		const res = await request
			.post('/auth/request-password-reset')
			.send({ email: 'nobody-here@example.com' });
		expect(res.status).toBe(200);
	});
});

describe('account settings', () => {
	const email = 'settings-flow@example.com';
	const password = 'correct-horse-battery-staple';

	it('changes the password while logged in', async () => {
		await request.post('/auth/signup').send({ email, password });
		const loginRes = await request.post('/auth/login').send({ email, password });
		const cookie = loginRes.headers['set-cookie'];

		const changeRes = await request
			.post('/auth/change-password')
			.set('Cookie', cookie)
			.send({ currentPassword: password, newPassword: 'brand-new-password' });
		expect(changeRes.status).toBe(200);

		const reLoginRes = await request
			.post('/auth/login')
			.send({ email, password: 'brand-new-password' });
		expect(reLoginRes.status).toBe(200);
	});

	it('updates the display name while logged in', async () => {
		const loginRes = await request
			.post('/auth/login')
			.send({ email, password: 'brand-new-password' });
		const cookie = loginRes.headers['set-cookie'];

		const updateRes = await request
			.patch('/auth/account')
			.set('Cookie', cookie)
			.send({ name: 'Updated Name' });
		expect(updateRes.status).toBe(200);
		expect(updateRes.body.user.name).toBe('Updated Name');
	});
});
