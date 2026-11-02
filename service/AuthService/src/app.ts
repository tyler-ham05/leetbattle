import cors from 'cors';
import express from 'express';
import { NextFunction, ErrorRequestHandler } from 'express';
import { requireAuth } from './middleware';
import {
	getRoot,
	login,
	logout,
	me,
	signup,
	changePassword,
	updateAccount,
} from './service';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', getRoot);

app.post('/signup', signup);
app.post('/login', login);
app.post('/logout', logout);
app.get('/me', requireAuth, me);
app.post('/password', requireAuth, changePassword);
app.patch('/account', requireAuth, updateAccount);

const errorHandler: ErrorRequestHandler = (err, _req, res, _next: NextFunction) => {
	res.status(err.status || 500).json( {
		message: err.message,
		errors: err.errors,
		status: err.status,
	});
	console.log(err.message);
	_next();
};
app.use(errorHandler);

export default app;
