// US-8-T-3 CodeService: each test case's stdout/stderr, clear errors, Output Limit Exceeded
// (All tests use the two-sum problem, question 1, like run.test.ts and submit.test.ts.)
//
// Run returns each test case's stdout and stderr (AC4)
//  - After Run, a solution that calls print("hello") should have "hello" in each case's stdout
//  - After Run, a solution that writes "careful" to sys.stderr should have "careful" in each case's stderr
//  - After Run, text the player prints to stdout should not appear in that case's stderr
//  - After Run, a solution that prints nothing should have an empty stdout for each case
// Submit returns stdout and stderr for each case that ran (AC4)
//  - After an Accepted Submit, "cases" should have one entry per test case
//  - After a Wrong Answer Submit, "cases" should have one entry more than "passed" (it stops at the failing case)
//  - After a Wrong Answer Submit, the last entry in "cases" should have the verdict "Wrong Answer"
//  - After Submit, a solution that calls print("hello") should have "hello" in the stdout of the first entry in "cases"
//  - After Submit, the existing fields (verdict, passed, total, case, expected, response) should still be returned
// Printing never changes the verdict under the limit (AC5)
//  - After Run, a correct solution that calls print() should get "Accepted" on every case
//  - After Submit, a correct solution that calls print() should get the verdict "Accepted"
//  - After Submit, a correct solution that prints just under 64 KB should get the verdict "Accepted"
// Errors come back with their message (AC3)
//  - After Run, code that raises ZeroDivisionError should get the verdict "Runtime Error"
//  - After Run, code that raises ZeroDivisionError should have "ZeroDivisionError" in the case's response
//  - After Run, code that raises ZeroDivisionError should have "Traceback" in the case's stderr
//  - After Run, code with a syntax error should get the verdict "Runtime Error"
//  - After Run, code with a syntax error should have "SyntaxError" in the case's stderr
// Too much output gets its own verdict (AC6)
//  - After Run, a solution that prints more than 64 KB should get "Output Limit Exceeded" on that case
//  - After Submit, a solution that prints more than 64 KB should get the verdict "Output Limit Exceeded"
//  - After Run, an Output Limit Exceeded case's stdout should be at most 64 KB (65,536 bytes) long
// Timeouts are still Time Limit Exceeded
//  - (changed from the existing "handles TLE" test, in submit.test.ts) After Submit, an infinite
//    loop that prints nothing should get the verdict "Time Limit Exceeded"
import { describe, expect, it } from 'vitest';
import { request } from './setup';

// The per-test-case output limit (stdout and stderr together).
const OUTPUT_LIMIT_BYTES = 65_536;

// A correct two-sum. `before` is Python run at the top of the method, so each
// fixture below is the same working solution plus one extra behaviour.
function twoSum(before = '', header = '') {
	return `${header}class Solution:
    def twoSum(self, nums: List[int], target: int) -> List[int]:
        ${before || 'pass'}
        seen = {}
        for i, num in enumerate(nums):
            complement = target - num
            if complement in seen:
                return [seen[complement], i]
            seen[num] = i
        return []`;
}

const correct = twoSum();
const printsHello = twoSum('print("hello")');
const writesToStderr = twoSum('sys.stderr.write("careful\\n")', 'import sys\n');
// Just under the limit: 60,000 characters plus print's newline.
const printsUnderLimit = twoSum('print("x" * 60000)');
// Past the limit, then returns the right answer: only the output is wrong.
const printsOverLimit = twoSum('print("x" * 70000)');

const wrongAnswer = `class Solution:
    def twoSum(self, nums: List[int], target: int) -> List[int]:
        return []`;

const dividesByZero = `class Solution:
    def twoSum(self, nums: List[int], target: int) -> List[int]:
        return 1 // 0`;

// Missing comma between parameters: Python can't even compile it.
const syntaxError = `class Solution:
    def twoSum(self, nums target):
        return []`;

const cases = [
	{ input: 'nums = [2,7,11,15], target = 9', expected: '[0,1]' },
	{ input: 'nums = [3,2,4], target = 6', expected: '[1,2]' },
	{ input: 'nums = [3,3], target = 6', expected: '[0,1]' },
];

interface RunCase { verdict: string; expected: string; response: string | null; stdout: string; stderr: string }

const run = async (code: string): Promise<RunCase[]> =>
	(await request.post('/solution').send({ code, cases, questionId: 1 })).body;

const submit = async (code: string) => (await request.post('/solution/1').send({ code })).body;

describe('US-8-T-3 Run returns each test case\'s stdout and stderr', () => {
	it('US-8-T-3 puts what the player prints in each case\'s stdout', async () => {
		const results = await run(printsHello);
		expect(results.every((result) => result.stdout.includes('hello'))).toBe(true);
	});

	it('US-8-T-3 puts what the player writes to sys.stderr in each case\'s stderr', async () => {
		const results = await run(writesToStderr);
		expect(results.every((result) => result.stderr.includes('careful'))).toBe(true);
	});

	it('US-8-T-3 keeps printed stdout out of stderr', async () => {
		const results = await run(printsHello);
		expect(results.some((result) => result.stderr.includes('hello'))).toBe(false);
	});

	it('US-8-T-3 returns an empty stdout when the player prints nothing', async () => {
		const results = await run(correct);
		expect(results.every((result) => result.stdout === '')).toBe(true);
	});
});

describe('US-8-T-3 Submit returns stdout and stderr for each case that ran', () => {
	it('US-8-T-3 has one entry in cases per test case after an Accepted Submit', async () => {
		const body = await submit(correct);
		expect(body.cases).toHaveLength(body.total);
	});

	// Submit stops at the first failure: the passing cases, then the failing one.
	it('US-8-T-3 has one more entry in cases than passed after a Wrong Answer Submit', async () => {
		const body = await submit(wrongAnswer);
		expect(body.cases).toHaveLength(body.passed + 1);
	});

	it('US-8-T-3 ends cases with the failing case after a Wrong Answer Submit', async () => {
		const body = await submit(wrongAnswer);
		expect(body.cases.at(-1).verdict).toBe('Wrong Answer');
	});

	it('US-8-T-3 puts what the player prints in the stdout of each Submit case', async () => {
		const body = await submit(printsHello);
		expect(body.cases[0].stdout).toContain('hello');
	});

	// GameService's scoring and the editor still read these.
	it('US-8-T-3 still returns the existing Submit fields', async () => {
		const body = await submit(wrongAnswer);
		expect(Object.keys(body)).toEqual(expect.arrayContaining(['verdict', 'passed', 'total', 'case', 'expected', 'response']));
	});
});

describe('US-8-T-3 printing never changes the verdict under the limit', () => {
	it('US-8-T-3 accepts every Run case of a correct solution that prints', async () => {
		const results = await run(printsHello);
		expect(results.every((result) => result.verdict === 'Accepted')).toBe(true);
	});

	it('US-8-T-3 accepts a Submit of a correct solution that prints', async () => {
		const body = await submit(printsHello);
		expect(body.verdict).toBe('Accepted');
	});

	it('US-8-T-3 accepts a Submit of a correct solution that prints just under 64 KB', { timeout: 20_000 }, async () => {
		const body = await submit(printsUnderLimit);
		expect(body.verdict).toBe('Accepted');
	});
});

describe('US-8-T-3 errors come back with their message', () => {
	it('US-8-T-3 gives a ZeroDivisionError the verdict Runtime Error', async () => {
		const [first] = await run(dividesByZero);
		expect(first.verdict).toBe('Runtime Error');
	});

	it('US-8-T-3 puts the ZeroDivisionError message in the response', async () => {
		const [first] = await run(dividesByZero);
		expect(first.response).toContain('ZeroDivisionError');
	});

	it('US-8-T-3 puts the traceback of a runtime error in stderr', async () => {
		const [first] = await run(dividesByZero);
		expect(first.stderr).toContain('Traceback');
	});

	it('US-8-T-3 gives a syntax error the verdict Runtime Error', async () => {
		const [first] = await run(syntaxError);
		expect(first.verdict).toBe('Runtime Error');
	});

	it('US-8-T-3 puts the SyntaxError in stderr', async () => {
		const [first] = await run(syntaxError);
		expect(first.stderr).toContain('SyntaxError');
	});
});

describe('US-8-T-3 too much output gets its own verdict', () => {
	it('US-8-T-3 gives a Run case that prints more than 64 KB Output Limit Exceeded', async () => {
		const [first] = await run(printsOverLimit);
		expect(first.verdict).toBe('Output Limit Exceeded');
	});

	it('US-8-T-3 gives a Submit that prints more than 64 KB Output Limit Exceeded', async () => {
		const body = await submit(printsOverLimit);
		expect(body.verdict).toBe('Output Limit Exceeded');
	});

	it('US-8-T-3 keeps at most 64 KB of an Output Limit Exceeded case\'s stdout', async () => {
		const [first] = await run(printsOverLimit);
		expect(Buffer.byteLength(first.stdout)).toBeLessThanOrEqual(OUTPUT_LIMIT_BYTES);
	});
});
