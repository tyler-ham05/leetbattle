import { describe, expect, it } from 'vitest';
import { request } from './setup';

describe('getRandomProblem Tests', () => {
	it('returns 200 on request', async () => {
		const res = await request
			.get('/problem');
		expect(res.status).toBe(200);
	});
});

describe('getProblem Tests', () => {
	it('returns a 404 for an unknown questionId', async () => {
		const res = await request
			.get('/problem/999999999');
		expect(res.status).toBe(404);
		expect(res.body).toEqual({ message: 'problem not found', status: 404 });
	});
});