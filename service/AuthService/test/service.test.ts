import { describe, expect, it } from 'vitest';
import { request } from './setup';

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

	it('signs up a new user and returns a session token', async () => {
		const res = await request
			.post('/signup')
			.send({ email, password, name: 'Test User' });
		expect(res.status).toBe(201);
		expect(res.body.user.email).toBe(email);
		expect(res.body.token).toBeTypeOf('string');
	});

	it('rejects a duplicate signup', async () => {
		const res = await request
			.post('/signup')
			.send({ email, password, name: 'Test User' });
		expect(res.status).toBe(409);
	});

	it('rejects login with the wrong password', async () => {
		const res = await request
			.post('/login')
			.send({ email, password: 'wrong-password' });
		expect(res.status).toBe(401);
	});

	it('logs in with the right credentials and reaches /me', async () => {
		const loginRes = await request.post('/login').send({ email, password });
		expect(loginRes.status).toBe(200);
		const token = loginRes.body.token;

		const meRes = await request.get('/me').set('Authorization', `Bearer ${token}`);
		expect(meRes.status).toBe(200);
		expect(meRes.body.user.email).toBe(email);
	});

	it('rejects /me without a token', async () => {
		const res = await request.get('/me');
		expect(res.status).toBe(401);
	});

	it('rejects /me with a garbage token', async () => {
		const res = await request.get('/me').set('Authorization', 'Bearer not-a-real-token');
		expect(res.status).toBe(401);
	});

	it('logs out', async () => {
		const logoutRes = await request.post('/logout');
		expect(logoutRes.status).toBe(204);
	});
});

describe('account settings', () => {
	const email = 'settings-flow@example.com';
	const password = 'correct-horse-battery-staple';

	it('changes the password while logged in', async () => {
		await request.post('/signup').send({ email, password });
		const loginRes = await request.post('/login').send({ email, password });
		const token = loginRes.body.token;

		const changeRes = await request
			.post('/password')
			.set('Authorization', `Bearer ${token}`)
			.send({ currentPassword: password, newPassword: 'brand-new-password' });
		expect(changeRes.status).toBe(200);

		const reLoginRes = await request
			.post('/login')
			.send({ email, password: 'brand-new-password' });
		expect(reLoginRes.status).toBe(200);
	});

	it('updates the display name while logged in', async () => {
		const loginRes = await request
			.post('/login')
			.send({ email, password: 'brand-new-password' });
		const token = loginRes.body.token;

		const updateRes = await request
			.patch('/account')
			.set('Authorization', `Bearer ${token}`)
			.send({ name: 'Updated Name' });
		expect(updateRes.status).toBe(200);
		expect(updateRes.body.user.name).toBe('Updated Name');
	});
});
