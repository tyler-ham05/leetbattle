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
		if (!res.ok) {
			throw new Error(`Request failed with status ${res.status}`);
		}
		return await res.json();
	}
	public async run(code: string, cases: unknown): Promise<RunResult> {
		const res = await fetch(`${CODESERVICE}/problem`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ code, cases }),
		});
		if (!res.ok) {
			throw new Error(`Request failed with status ${res.status}`);
		}
		return await res.json();
	}
	public async submit(questionId: number, code: string): Promise<SubmitResult> {
		const res = await fetch(`${CODESERVICE}/problem/${questionId}`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ code }),
		});
		if (!res.ok) {
			throw new Error(`Request failed with status ${res.status}`);
		}
		return await res.json();
	}
}
