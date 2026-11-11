import cors from 'cors';
import express from 'express';
import { createGame, getGame, getRoot } from './service';
import type { NextFunction, ErrorRequestHandler } from 'express';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', getRoot);
app.put('/game', createGame);
app.get('/game/:id', getGame);




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
