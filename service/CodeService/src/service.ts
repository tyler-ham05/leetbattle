import { NextFunction, Request, Response } from 'express';
import { pool } from './db';
import {
	extractImports,
	parseCheckCases,
	questionIdParamsSchema,
	runBodySchema,
	runCases,
	submitBodySchema,
	unescapeNewlines,
	verdictForResult,
	verdictForResults,
} from './utils/coderunner';

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

export async function runProblem(req: Request, res: Response, next: NextFunction) {
	try {
		const body = runBodySchema.safeParse(req.body);
		if (!body.success) {
			return next(new HttpError(400, 'code, cases, and questionId are required'));
		}
		const { code, cases, questionId } = body.data;

		const result = await pool.query(
			'SELECT entry_point, prompt FROM problems WHERE question_id = $1',
			[questionId],
		);
		if (result.rows.length === 0) {
			return next(new HttpError(404, 'problem not found'));
		}
		const { entry_point: entryPoint, prompt } = result.rows[0];
		const imports = extractImports(unescapeNewlines(prompt ?? ''));

		const results = await runCases(imports, code, entryPoint, cases, { runAll: true });
		res.json(
			results.map((r) => ({
				verdict: verdictForResult(r),
				expected: r.expected,
				response: r.error ?? r.actual,
			})),
		);
	} catch (err) {
		next(err);
	}
}

export async function submitProblem(req: Request, res: Response, next: NextFunction) {
	try {
		const body = submitBodySchema.safeParse(req.body);
		if (!body.success) {
			return next(new HttpError(400, 'code is required'));
		}
		const { code } = body.data;

		const params = questionIdParamsSchema.safeParse(req.params);
		if (!params.success) {
			return next(new HttpError(404, 'problem not found'));
		}
		const { questionId } = params.data;

		const result = await pool.query(
			'SELECT * FROM problems WHERE question_id = $1',
			[questionId],
		);
		if (result.rows.length === 0) {
			return next(new HttpError(404, 'problem not found'));
		}
		const problem = result.rows[0];
		const imports = extractImports(unescapeNewlines(problem.prompt ?? ''));
		const cases = parseCheckCases(unescapeNewlines(problem.test ?? ''));

		const results = await runCases(imports, code, problem.entry_point, cases);
		const passed = results.filter((r) => r.passed).length;
		const firstFailure = results.find((r) => !r.passed);
		const verdict = verdictForResults(results);

		res.json({
			verdict,
			passed,
			total: cases.length,
			case: firstFailure ? firstFailure.input : null,
			expected: firstFailure ? firstFailure.expected : null,
			response: firstFailure ? (firstFailure.error ?? firstFailure.actual) : null,
		});
	} catch (err) {
		next(err);
	}
}
