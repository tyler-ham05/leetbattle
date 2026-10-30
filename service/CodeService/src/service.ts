import { NextFunction, Request, Response } from 'express';
import { pool } from './db';

class HttpError extends Error {
	status: number;

	constructor(status: number, message: string) {
		super(message);
		this.status = status;
	}
}

export function getRoot(_req: Request, res: Response) {
	res.json({
		service: 'code-service',
		message: 'Hello from code-service',
	});
}

export async function getProblem(req: Request, res: Response, next: NextFunction) {
	const { questionId } = req.params;
	try {
		const result = await pool.query(
			'SELECT * FROM problems WHERE question_id = $1',
			[questionId],
		);

		if (result.rows.length === 0) {
			return next(new HttpError(404, 'problem not found'));
		}
		res.json(result.rows[0]);
	} catch (err) {
		next(err);
	}
}

export async function getRandomProblem(req: Request, res: Response, next: NextFunction) {
	const { difficulty = 'Easy', quantity = 3 } = req.query;
	console.log(quantity);
	try {
		const result = await pool.query(
			'SELECT * FROM problems WHERE difficulty = $1 ORDER BY RANDOM() LIMIT $2',
			[difficulty, quantity],
		);

		if (result.rows.length === 0) {
			return next(new HttpError(404, 'problem not found'));
		}
		res.json(result.rows);
	} catch (err) {
		next(err);
	}
}

//NOT FINISHED
export async function runProblem(req: Request, res: Response, next: NextFunction) {
	const {code, cases} = req.body;
	try {
		// INSERT CODE RUNNER HERE
		const responses = Array(cases.length).fill(0);
		console.log(code);
		res.json({verdict: 'pass', cases, responses});
		// CODE RUNNER ENDS HERE
	} catch (err) {
		next(err);
	}
}

// NOT FINISHED
export async function submitProblem(req: Request, res: Response, next: NextFunction) {
	const {code} = req.body;
	const {questionId} = req.params;
	try {
		const result = await pool.query(
			'SELECT * FROM problems WHERE question_id = $1',
			[questionId],
		);
		if (result.rows.length === 0) {
			return next(new HttpError(404, 'problem not found'));
		}
		// INSERT CODE RUNNER HERE
		const answer = result.rows[0];
		console.log(code, answer);
		res.json({verdict: 'pass', passed: 4, case: null, response: null});
		// CODE RUNNER ENDS HERE
	} catch (err) {
		next(err);
	}
}
