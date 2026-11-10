import { describe, expect, it } from 'vitest';
import { request } from './setup';

describe('error handler', () => {
	// Pseudocode: handles undefined errors as 500
	//
	// Our own HttpError always carries a `.status`, but not every error that
	// reaches the global error handler is one of ours - e.g. a raw db driver
	// error has no `.status` at all. Force that path by passing a `quantity`
	// query param that Postgres can't bind as a LIMIT value, which rejects
	// inside the pool.query() call with a plain Error (no `.status`). The
	// error handler must still respond, defaulting to 500 rather than
	// leaving the request hanging or crashing the process.
	it('responds 500 when the error has no status', async () => {
		const res = await request
			.get('/problem')
			.query({ quantity: 'not-a-number' });
		expect(res.status).toBe(500);
	});
});

describe('health check', () => {
	it('returns 200 on request', async () => {
		const res = await request
			.get('/');
		expect(res.status).toBe(200);
	});
});

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