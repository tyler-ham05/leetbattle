import express from 'express';
import { getRoot, getProblem } from './service';

const app = express();

app.use(express.json());

app.get('/', getRoot);
app.get('/problems/:taskId', getProblem);

export default app;
