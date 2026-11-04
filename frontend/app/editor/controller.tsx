const CODESERVICE = process.env.NEXT_PUBLIC_CODE_URL ?? 'http://127.0.0.1:4001';
export interface Problem {
	task_id: string;
	question_id: number;
	difficulty: 'Easy' | 'Medium' | 'Hard';
	tags: string[];
	problem_description: string;
	starter_code: string;
	entry_point: string;
	input_output?: unknown; // test cases from the problems table (JSONB)
}

export interface TestCase {
	input: string;
	expected: string;
}

function stringifyCase(value: unknown): string {
	return typeof value === 'string' ? value : JSON.stringify(value);
}

// input_output is a JSONB column with no fixed shape across sources (the imported
// LeetCodeDataset rows vs. hand-seeded local rows), so this stays defensive and
// falls back to no test cases rather than guessing at a shape that isn't there.
export function parseTestCases(inputOutput: unknown): TestCase[] {
	let value = inputOutput;
	if (typeof value === 'string') {
		try {
			value = JSON.parse(value);
		} catch {
			return [];
		}
	}
	if (!value || typeof value !== 'object') {
		return [];
	}

	if (Array.isArray(value)) {
		return value
			.filter((entry): entry is Record<string, unknown> => !!entry && typeof entry === 'object')
			.map((entry) => ({
				input: stringifyCase(entry.input),
				expected: stringifyCase(entry.expected ?? entry.output),
			}));
	}

	const { inputs, outputs } = value as { inputs?: unknown[]; outputs?: unknown[] };
	if (Array.isArray(inputs) && Array.isArray(outputs)) {
		return inputs.map((input, i) => ({
			input: stringifyCase(input),
			expected: stringifyCase(outputs[i]),
		}));
	}

	return [];
}

export async function handleResponse(res:Response){
	if (!res.ok) {
		throw new Error(`Request failed with status ${res.status}`);
	}
	return await res.json();
}

export interface RunResult {
    verdict: string;
    cases: unknown;
    responses: unknown;
}

export interface SubmitResult {
    verdict: string;
    passed: number;
    case: unknown;
    response: unknown;
}

export class APIService {
	public async generate(): Promise<Problem[]> {
		const res = await fetch(`${CODESERVICE}/problem`, {
			method: 'GET',
		});
		return await handleResponse(res);
	}
	public async run(code: string, cases: unknown, questionId: number): Promise<RunResult> {
		const res = await fetch(`${CODESERVICE}/solution`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ code, cases, questionId }),
		});
		return await handleResponse(res);
	}
	public async submit(questionId: number, code: string): Promise<SubmitResult> {
		const res = await fetch(`${CODESERVICE}/solution/${questionId}`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ code }),
		});
		return await handleResponse(res);
	}
}
