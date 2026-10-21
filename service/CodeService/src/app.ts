import cors from 'cors';
import express from 'express';
import { getRoot, getProblem, getRandomProblem, checkProblem } from './service';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', getRoot);
app.get('/problem/:questionId', getProblem);
app.get('/problem', getRandomProblem);

app.post('/problem/:questionId', checkProblem);

export default app;
