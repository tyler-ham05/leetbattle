import cors from 'cors';
import express from 'express';
import { getRoot, getProblem, getRandomProblem,runProblem, submitProblem } from './service';
import {
	createLobbySession,
	getLobby,
	joinLobbyTeam,
	leaveLobby,
	updateLobbyPlayerName,
} from './lobby';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', getRoot);
app.get('/problem/:questionId', getProblem);
app.get('/problem', getRandomProblem);
app.post('/problem', runProblem);
app.post('/problem/:questionId', submitProblem);
app.post('/lobby/session', createLobbySession);
app.get('/lobby', getLobby);
app.patch('/lobby/name', updateLobbyPlayerName);
app.post('/lobby/join', joinLobbyTeam);
app.delete('/lobby/leave', leaveLobby);

export default app;
