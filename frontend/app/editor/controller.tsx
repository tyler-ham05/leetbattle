const CODESERVICE = 'http://127.0.0.1:4001';

export interface Problem {
    task_id: string;
    question_id: number;
    difficulty: 'Easy' | 'Medium' | 'Hard';
    tags: string[];
    problem_description: string;
    starter_code: string;
    entry_point: string;
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
}