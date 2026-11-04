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

const infiniteLoop = `class Solution:
    def twoSum(self, nums: List[int], target: int) -> List[int]:
        i = 1
        while i > 0:
            print("hello world!")
        return []`;

describe('solution tests', () => {
	it('returns a 200 on a valid question and code', async () => {
		const res = await request
			.post('/solution/1')
			.send({ code });
		expect(res.status).toBe(200);

	});
	it('returns correct number of tests passed', async () => {
		const res = await request
			.post('/solution/1')
			.send({ code });
		expect(res.body.total).toEqual(res.body.passed);
	});

	it('Handles Wrong Answer', async () => {
		const res = await request
			.post('/solution/1')
			.send({ code: wrongAnswer });
		expect(res.body.verdict).toBe('Wrong Answer');
	});

	it('Handles Wrong Answer number of tests passed', async () => {
		const res = await request
			.post('/solution/1')
			.send({ code: wrongAnswer });
		expect(res.body.passed).toEqual(0);
	});


	it('handles buggy code', async () => {
		const res = await request
			.post('/solution/1')
			.send({ code: buggyCode });
		expect(res.body.verdict).toBe('Runtime Error');
	});

	it('handles TLE', { timeout: 10_000 }, async () => {
		const res = await request
			.post('/solution/1')
			.send({ code: infiniteLoop });
		console.log(res.body.response);
		expect(res.body.verdict).toBe('Time Limit Exceeded');
	});

	it('returns a 404 on a bad id', async () => {
		const res = await request
			.post('/solution/999999999999')
			.send({ code });
		expect(res.status).toBe(404);
	});
	it('returns a 400 on no body', async () => {
		const res = await request
			.post('/solution/1');
		expect(res.status).toBe(400);
	});

});