import { describe, expect, it } from 'vitest';
import { request } from './setup';

describe('getRandomProblem Tests', () => {
	it('returns 200 on request', async () => {
		const res = await request
			.get('/problem');
		expect(res.status).toBe(200);
	});
});