import { describe, expect, it } from 'vitest';
import { request } from './setup';

const code = `class Solution:
    def twoSum(self, nums: List[int], target: int) -> List[int]:
        seen = {}  # value -> index
        for i, num in enumerate(nums):
            complement = target - num
            if complement in seen:
                return [seen[complement], i]
            seen[num] = i
        return []`;

const wrongAnswer = `class Solution:
    def twoSum(self, nums: List[int], target: int) -> List[int]:
        return []`;

const buggyCode = `class Solution:
    def twoSum(self, nums: List[int], target: int) -> List[int]:
        neegy`;

const cases = [
	{ input: 'nums = [2,7,11,15], target = 9', expected: '[0,1]' },
	{ input: 'nums = [3,2,4], target = 6', expected: '[1,2]' },
	{ input: 'nums = [3,3], target = 6', expected: '[0,1]' },
];

describe('run tests', () => {
	it('returns a 200 on a valid question and code', async () => {
		const res = await request
			.post('/solution')
			.send({ code, cases, questionId: 1 });
		expect(res.status).toBe(200);
	});

	it('runs every case and reports Accepted for correct code', async () => {
		const res = await request
			.post('/solution')
			.send({ code, cases, questionId: 1 });
		expect(res.body).toHaveLength(cases.length);
		for (const result of res.body) {
			expect(result.verdict).toBe('Accepted');
		}
	});

	it('keeps running every case (not just up to the first failure) for Wrong Answer', async () => {
		const res = await request
			.post('/solution')
			.send({ code: wrongAnswer, cases, questionId: 1 });
		expect(res.body).toHaveLength(cases.length);
		for (const [i, result] of res.body.entries()) {
			expect(result.verdict).toBe('Wrong Answer');
			expect(result.expected).toBe(cases[i].expected);
			expect(result.response).toBe('[]');
		}
	});

	it('runs every case and reports Runtime Error for buggy code', async () => {
		const res = await request
			.post('/solution')
			.send({ code: buggyCode, cases, questionId: 1 });
		expect(res.body).toHaveLength(cases.length);
		for (const result of res.body) {
			expect(result.verdict).toBe('Runtime Error');
			expect(typeof result.response).toBe('string');
		}
	});

	it('returns a 404 on a bad id', async () => {
		const res = await request
			.post('/solution')
			.send({ code, cases, questionId: 999999999 });
		expect(res.status).toBe(404);
	});

	it('returns a 400 on no body', async () => {
		const res = await request
			.post('/solution');
		expect(res.status).toBe(400);
	});
});
