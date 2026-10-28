import { describe, expect, it } from 'vitest';
import { request } from './setup';

describe('GET /', () => {
	it('returns a welcome message', async () => {
		const res = await request.get('/');
		expect(res.status).toBe(200);
		expect(res.body.service).toBe('auth-service');
	});
});
