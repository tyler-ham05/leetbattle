// Shared fixtures and fetch stubbing for the frontend tests.
import { vi } from 'vitest';
import type { User } from '../app/login/controller';
import type { Problem } from '../app/editor/controller';

export const fakeUser: User = {
	id: 'u1',
	email: 'ada@example.com',
	name: 'Ada',
	emailVerified: true,
	createdAt: '2026-01-01T00:00:00Z',
};

export function jsonResponse(body: unknown, status = 200): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'Content-Type': 'application/json' },
	});
}

// Replaces global fetch with a mock and returns it so tests can assert on the
// calls the code under test made.
export function stubFetch(handler: (_url: string, _init?: RequestInit) => Response | Promise<Response>) {
	const mock = vi.fn(async (url: string | URL | Request, init?: RequestInit) =>
		handler(String(url), init),
	);
	vi.stubGlobal('fetch', mock);
	return mock;
}

export function makeProblem(id: number, difficulty: Problem['difficulty'], overrides: Partial<Problem> = {}): Problem {
	return {
		task_id: `problem-number-${id}`,
		question_id: id,
		difficulty,
		tags: [],
		problem_description: `Description for problem ${id}`,
		// The API sends newlines as literal backslash-n; the editor must unescape them.
		starter_code: `class Solution:\\n    def solve${id}(self, x):\\n        pass`,
		entry_point: `solve${id}`,
		input_output: { inputs: [`[${id}]`, `[${id + 1}]`], outputs: [`${id}`, `${id + 1}`] },
		...overrides,
	};
}

export const threeProblems: Problem[] = [
	makeProblem(1, 'Easy'),
	makeProblem(2, 'Medium'),
	makeProblem(3, 'Hard'),
];

export interface RecordedRequest {
	url: string;
	method: string;
	headers: Record<string, string>;
	body: unknown;
}

// Flattens the calls of a stubFetch mock into plain objects (body JSON-parsed).
export function requestsOf(mock: ReturnType<typeof stubFetch>): RecordedRequest[] {
	return mock.mock.calls.map(([url, init]) => ({
		url: String(url),
		method: init?.method ?? 'GET',
		headers: (init?.headers ?? {}) as Record<string, string>,
		body: typeof init?.body === 'string' ? JSON.parse(init.body) : undefined,
	}));
}
