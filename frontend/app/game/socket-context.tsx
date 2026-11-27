'use client';

import { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import { getToken } from '../login/controller';
import { useRejoin } from '../_shared/rejoin-context';
import { useAuth } from '../login/context';
import type { TeamId } from '../lobby/socket-context';
import type { SubmitResult } from '../editor/controller';
import type { EditorWorkspace } from '../editor/context';
import type { ChatMessage } from '../editor/chat-context';

export interface GamePlayer {
	userId: string;
	displayName: string;
	team: TeamId;
	connected: boolean;
	left: boolean; // didn't reconnect within the window
}

// One teammate's vote during the ban phase (US-8-T-1). A vote never carries a
// team: a player is only ever sent their own team's votes.
export interface Voter {
	userId: string;
	displayName: string;
}

// One question a team banned, as the reveal shows it once the ban window has
// closed: the question, the team that banned it, never who voted, and the
// place it had in the pool so the ban screen can strike it through there.
export interface BannedProblem {
	taskId: string;
	questionId: number;
	difficulty: string;
	topics: string[];
	team: TeamId;
	position: number;
}

// Everything the ban screen needs that isn't a question, as GameService sends
// it to one team. Every count the screen shows comes from here, so a later
// game mode can change the format without touching the frontend.
export interface BanState {
	perTeam: number; // how many questions each team bans
	questionsInPlay: number; // how many the match is played on, after the bans
	votesCast: number; // how many of the receiving team have voted
	voters: number; // how many of the receiving team can vote
	revealSecondsRemaining: number; // 0 until the window closes and the reveal starts
	banned: BannedProblem[]; // empty until the reveal; dropped when the match moves on
}

// The player on one team who picked a problem during the pick phase
// (US-6-T-10). Each team picks independently, so a problem can have up to
// one picker per team.
export interface Picker {
	userId: string;
	displayName: string;
	team: TeamId;
}

// One problem in the match pool: enough to list it, and its question_id to
// load the full problem from CodeService. topics are all the ban and pick screens show.
export interface PoolProblem {
	taskId: string;
	questionId: number;
	difficulty: string;
	topics: string[];
	votes: Voter[]; // the receiving team's votes on this question; never the other team's
	pickedBy: Record<TeamId, Picker | null>; // null per team until a player on it picks
}

// What GameService sends on `game:state`: the whole match, re-sent whenever
// something about it changes (a player connecting or dropping, a ban, ...).
export interface GameState {
	gameId: string;
	// waiting: players are still connecting, the clock hasn't started
	// banning: every player votes for one problem, and each team bans what it voted for most
	// picking: every player picks one of the problems the bans left; also skipped for a 1v1
	phase: 'waiting' | 'banning' | 'picking' | 'playing';
	startedAt: number | null;
	secondsRemaining: number;
	banSecondsRemaining: number; // seconds left in the ban window
	pickSecondsRemaining: number; // seconds left in the pick window (US-6-T-10)
	scores: Record<TeamId, number>;
	bans: BanState;
	problemPool: PoolProblem[];
	players: GamePlayer[];
	forfeitVotes: Record<TeamId, number>;
	solved: Record<TeamId, string[]>; // task ids each team has solved (US-4-T-6)
}

// What GameService sends once on `game:ended`. winner is null for a draw.
export interface GameResult {
	winner: TeamId | null;
	reason: 'forfeit' | 'disconnect' | 'time' | 'solved';
}

export interface GameError {
	code: string;
	message: string;
}

// A teammate's saved workspaces, by questionId, as GameService relays and
// snapshots them on "game:code" / "game:code:snapshot".
export type TeammateCode = Record<string, Record<number, EditorWorkspace>>;

// One entry of a "game:code" event or a "game:code:snapshot" array.
interface CodeEntry {
	userId: string;
	questionId: number;
	workspace: EditorWorkspace;
}

interface GameSocketContextValue {
	socket: Socket | null;
	connected: boolean;
	game: GameState | null;
	result: GameResult | null;
	error: GameError | null;
	connect: (_gameId: string) => Socket | null;
	// Votes for the player's team to forfeit; the team forfeits once every
	// connected teammate has voted.
	forfeit: () => void;
	// Votes for one problem during the ban phase (US-8-T-1); voting again moves the vote.
	ban: (_questionId: number) => void;
	// Picks one of the problems the bans left during the pick phase (US-6-T-10).
	pick: (_questionId: number) => void;
	// Has the game grade a solution; rejects with a readable message if refused.
	submit: (_questionId: number, _code: string) => Promise<SubmitResult>;
	// Sends the player's editor for one question to their own team.
	shareCode: (_questionId: number, _workspace: EditorWorkspace) => void;
	// Teammates' saved workspaces, by userId then questionId, read only.
	teammateCode: TeammateCode;
	// US-6-T-13: the questionId of each teammate's most recent shared edit, by
	// userId; a teammate who hasn't edited anything has no entry.
	teammateQuestion: Record<string, number>;
	// The team's chat so far in this match, oldest first, as GameService sends
	// it on "chat:history" each time the socket connects or reconnects.
	chatHistory: ChatMessage[];
	clearError: () => void;
}

// How long to wait for the game to grade a submission (CodeService can be slow).
const SUBMIT_TIMEOUT_MS = 30_000;

// What each reason GameService refuses a submission with means to the player.
const SUBMIT_REFUSALS: Record<string, string> = {
	cooldown: 'Your team just submitted. Wait a few seconds before submitting again.',
	'team-busy': 'A teammate\'s submission is still being graded.',
	'not-playing': 'The match isn\'t running, so submissions are closed.',
	'unknown-problem': 'This question isn\'t part of the match.',
	'grading-failed': 'Your submission couldn\'t be graded. Try again.',
};

const GameSocketContext = createContext<GameSocketContextValue | null>(null);
const GAME_URL = process.env.NEXT_PUBLIC_GAME_URL ?? 'http://localhost:4004';

// What each reason GameService refuses a connection with means to the player.
const REFUSALS: Record<string, string> = {
	unauthorized: 'Your login session is invalid or expired. Log in again.',
	'not-in-game': 'You are not a player in this match.',
};

// US-6-T-8: shown instead of "not a player" when a match the player was
// rejoining ended before they got back in.
const MATCH_UNAVAILABLE = 'This match is no longer available.';

export function GameSocketProvider({ children }: { children: ReactNode }) {
	const { user } = useAuth();
	// The match the Rejoin Match button offered, read when a connection is
	// refused; a ref so connect() doesn't change every time the check runs.
	const rejoin = useRejoin();
	const rejoinRef = useRef(rejoin);
	useEffect(() => {
		rejoinRef.current = rejoin;
	}, [rejoin]);
	const [socket, setSocket] = useState<Socket | null>(null);
	const [connected, setConnected] = useState(false);
	const [game, setGame] = useState<GameState | null>(null);
	const [result, setResult] = useState<GameResult | null>(null);
	const [error, setError] = useState<GameError | null>(null);
	const [teammateCode, setTeammateCode] = useState<TeammateCode>({});
	const [teammateQuestion, setTeammateQuestion] = useState<Record<string, number>>({});
	const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
	const socketRef = useRef<{ gameId: string; socket: Socket } | null>(null);

	// Saves one teammate's workspace for one question, replacing (not merging
	// with) whatever was saved for that same teammate and question before.
	const saveTeammateCode = useCallback(({ userId, questionId, workspace }: CodeEntry) => {
		setTeammateCode((current) => ({
			...current,
			[userId]: { ...current[userId], [questionId]: workspace },
		}));
		// The latest edit wins, so a snapshot's last entry per teammate is kept.
		setTeammateQuestion((current) => ({ ...current, [userId]: questionId }));
	}, []);

	// Opens the socket for one match. GameService checks the login token and
	// that this user is on the match's roster before letting the socket in.
	const connect = useCallback((gameId: string) => {
		if (!user) return null;
		if (socketRef.current?.gameId === gameId) return socketRef.current.socket;

		socketRef.current?.socket.disconnect();
		const token = getToken();
		if (!token) {
			setError({ code: 'missing-token', message: 'Log in again to join the match.' });
			return null;
		}

		const nextSocket = io(GAME_URL, { autoConnect: false, auth: { token, gameId } });
		nextSocket.on('game:state', (state: GameState) => {
			setGame(state);
			setError(null);
		});
		nextSocket.on('game:ended', (ended: GameResult) => setResult(ended));
		nextSocket.on('game:code', (entry: CodeEntry) => saveTeammateCode(entry));
		nextSocket.on('game:code:snapshot', (entries: CodeEntry[]) => {
			for (const entry of entries) saveTeammateCode(entry);
		});
		nextSocket.on('chat:history', (messages: ChatMessage[]) => setChatHistory(messages));
		nextSocket.on('connect_error', (reason: Error) => {
			// GameService forgets a match once it ends, so rejoining one that ended
			// in the meantime is refused as not-in-game.
			if (reason.message === 'not-in-game' && rejoinRef.current?.match?.gameId === gameId) {
				rejoinRef.current.clear(gameId);
				setError({ code: 'match-unavailable', message: MATCH_UNAVAILABLE });
				return;
			}
			const refusal = REFUSALS[reason.message];
			setError(refusal
				? { code: reason.message, message: refusal }
				: { code: 'connection-error', message: 'Could not connect to the game service.' });
		});
		nextSocket.on('connect', () => {
			setConnected(true);
			setError(null);
		});
		nextSocket.on('disconnect', () => setConnected(false));
		socketRef.current = { gameId, socket: nextSocket };
		setSocket(nextSocket);
		setConnected(false);
		setGame(null);
		setResult(null);
		setTeammateCode({});
		setTeammateQuestion({});
		setChatHistory([]);
		nextSocket.connect();
		return nextSocket;
	}, [saveTeammateCode, user]);

	// The provider lives on the game page, so leaving the page closes the socket.
	useEffect(() => () => {
		socketRef.current?.socket.disconnect();
		socketRef.current = null;
	}, []);

	const forfeit = useCallback(() => {
		socketRef.current?.socket.emit('game:forfeit');
	}, []);

	const ban = useCallback((questionId: number) => {
		socketRef.current?.socket.emit('game:ban', { questionId });
	}, []);

	const pick = useCallback((questionId: number) => {
		socketRef.current?.socket.emit('game:pick', { questionId });
	}, []);

	const submit = useCallback(async (questionId: number, code: string): Promise<SubmitResult> => {
		const socket = socketRef.current?.socket;
		if (!socket) throw new Error(SUBMIT_REFUSALS['not-playing']);
		const response = await socket.timeout(SUBMIT_TIMEOUT_MS).emitWithAck('game:submit', { questionId, code }) as SubmitResult | { error: string };
		if ('error' in response) throw new Error(SUBMIT_REFUSALS[response.error] ?? SUBMIT_REFUSALS['grading-failed']);
		return response;
	}, []);

	const shareCode = useCallback((questionId: number, workspace: EditorWorkspace) => {
		socketRef.current?.socket.emit('game:code', { questionId, workspace });
	}, []);

	const clearError = useCallback(() => setError(null), []);
	return (
		<GameSocketContext.Provider value={{ socket, connected, game, result, error, connect, forfeit, ban, pick, submit, shareCode, teammateCode, teammateQuestion, chatHistory, clearError }}>
			{children}
		</GameSocketContext.Provider>
	);
}

export function useGameSocket(): GameSocketContextValue {
	const context = useContext(GameSocketContext);
	if (!context) throw new Error('useGameSocket must be used within GameSocketProvider');
	return context;
}
