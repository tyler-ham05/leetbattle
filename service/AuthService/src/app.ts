import cors from 'cors';
import express from 'express';
import { NextFunction, ErrorRequestHandler } from 'express';
import { limitByIp, requireAuth, requireInternalKey } from './middleware';
import {
	getRoot,
	login,
	logout,
	me,
	signup,
	changePassword,
	updateAccount,
	forgotPassword,
	resetPassword,
	reportMatchResult,
} from './service';

const app = express();

// Cloud Run sits one proxy hop in front of the service, so req.ip should be
// the client's address from X-Forwarded-For (used by the rate limit below).
app.set('trust proxy', 1);

// US-5-T-13: at most 5 requests per IP every 15 minutes on each reset endpoint.
const RESET_LIMIT = 5;
const RESET_WINDOW_MS = 15 * 60_000;

app.use(cors());
app.use(express.json());

app.get('/', getRoot);

app.post('/signup', signup);
app.post('/login', login);
app.post('/logout', logout);
app.get('/me', requireAuth, me);
app.post('/password', requireAuth, changePassword);
app.post('/password/forgot', limitByIp(RESET_LIMIT, RESET_WINDOW_MS), forgotPassword);
app.post('/password/reset', limitByIp(RESET_LIMIT, RESET_WINDOW_MS), resetPassword);
app.patch('/account', requireAuth, updateAccount);
// US-7-T-1: GameService reports each finished match here (see requireInternalKey).
app.post('/internal/match-results', requireInternalKey, reportMatchResult);

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
