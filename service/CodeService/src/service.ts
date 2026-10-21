import { Request, Response } from 'express';
import { pool } from './db';

export function getRoot(_req: Request, res: Response) {
	res.json({
		service: 'code-service',
		message: 'Hello from code-service',
	});
}

export async function getProblem(req: Request, res: Response) {
	const { questionId } = req.params;
	try {
		const result = await pool.query(
			'SELECT * FROM problems WHERE question_id = $1',
			[questionId],
		);

		if (result.rows.length === 0) {
			return res.status(404).json({ error: 'problem not found' });
		}

		res.json(result.rows[0]);
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: 'failed to fetch problem' });
	}
}

export async function getRandomProblem(req: Request, res: Response) {
	const { difficulty = 'Easy', quantity = 3 } = req.query;
	console.log(quantity);
	try {
		const result = await pool.query(
			'SELECT * FROM problems WHERE difficulty = $1 ORDER BY RANDOM() LIMIT $2',
			[difficulty, quantity],
		);

		if (result.rows.length === 0) {
			return res.status(404).json({ error: 'problem not found' });
		}
		res.json(result.rows);
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: 'failed to fetch problem' });
	}
}

// NOT FINISHED
export async function checkProblem(req: Request, res: Response) {
	const {code} = req.body;
	const {questionId} = req.params;
	try {
		const result = await pool.query(
			'SELECT test, FROM problems WHERE question_id = $1',
			[questionId],
		);
		if (result.rows.length === 0) {
			return res.status(404).json({ error: 'problem not found' });
		};
		
		const answer = result.rows[0].json();
		console.log(code, answer);
		
		res.json({verdict: 'pass', passed: 4, case: null, response: null});
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: 'internal server error' });
	}
}
