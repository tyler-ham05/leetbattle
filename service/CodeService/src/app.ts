import cors from 'cors';
import express from 'express';
import { getRoot, getProblem, getRandomProblem,runProblem, submitProblem } from './service';
import { NextFunction, ErrorRequestHandler } from 'express';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', getRoot);
app.get('/problem/:questionId', getProblem);
app.get('/problem', getRandomProblem);
app.post('/problem', runProblem);
app.post('/problem/:questionId', submitProblem);

const errorHandler: ErrorRequestHandler = (err, _req, res, _next: NextFunction) => {
	res.status(err.status || 500).json( {
		message: err.message,
		errors: err.errors,
		status: err.status,
	});
	_next();
};
app.use(errorHandler);

export default app;
