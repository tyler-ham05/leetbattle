import { Request, Response } from 'express';
import { pool } from './db';

export function getRoot(_req: Request, res: Response) {
	res.json({
		service: 'code-service',
		message: 'Hello from code-service',
	});
}

export async function getProblem(req: Request, res: Response) {
	const { taskId } = req.params;

	try {
		const result = await pool.query(
			'SELECT * FROM problems WHERE task_id = $1',
			[taskId],
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
