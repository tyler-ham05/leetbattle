import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import { requireAuth } from './middleware';
import {
	changePassword,
	getRoot,
	login,
	logout,
	me,
	requestPasswordReset,
	resendVerification,
	resetPassword,
	signup,
	updateAccount,
	verifyEmail,
} from './service';

const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:3000';

const app = express();

app.use(cors({ origin: FRONTEND_URL, credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.get('/', getRoot);

app.post('/auth/signup', signup);
app.post('/auth/login', login);
app.post('/auth/logout', logout);
app.get('/auth/me', requireAuth, me);

app.post('/auth/verify-email', verifyEmail);
app.post('/auth/resend-verification', requireAuth, resendVerification);

app.post('/auth/request-password-reset', requestPasswordReset);
app.post('/auth/reset-password', resetPassword);

app.post('/auth/change-password', requireAuth, changePassword);
app.patch('/auth/account', requireAuth, updateAccount);

export default app;
