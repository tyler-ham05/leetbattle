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

// The player who banned a problem during the ban phase.
export interface Banner {
	userId: string;
	displayName: string;
	team: TeamId;
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
	bannedBy: Banner | null; // null until a player bans it
	pickedBy: Record<TeamId, Picker | null>; // null per team until a player on it picks
}

// What GameService sends on `game:state`: the whole match, re-sent whenever
// something about it changes (a player connecting or dropping, a ban, ...).
export interface GameState {
	gameId: string;
	// waiting: players are still connecting, the clock hasn't started
	// banning: every player bans one problem; skipped for a 1v1 (US-6-T-10)
	// picking: every player picks one of the problems the bans left; also skipped for a 1v1
	phase: 'waiting' | 'banning' | 'picking' | 'playing';
	startedAt: number | null;
	secondsRemaining: number;
	banSecondsRemaining: number; // seconds left in the ban window
	pickSecondsRemaining: number; // seconds left in the pick window (US-6-T-10)
	scores: Record<TeamId, number>;
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
	// Bans one problem from the pool during the ban phase.
	ban: (_questionId: number) => void;
	// Picks one of the problems the bans left during the pick phase (US-6-T-10).
	// A player may pick more than one, up to their own limit (US-8-2).
	pick: (_questionId: number) => void;
	// Gives back one of the player's own picks during the pick phase (US-8-2).
	unpick: (_questionId: number) => void;
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

	const unpick = useCallback((questionId: number) => {
		socketRef.current?.socket.emit('game:unpick', { questionId });
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
		<GameSocketContext.Provider value={{ socket, connected, game, result, error, connect, forfeit, ban, pick, unpick, submit, shareCode, teammateCode, teammateQuestion, chatHistory, clearError }}>
			{children}
		</GameSocketContext.Provider>
	);
}

export function useGameSocket(): GameSocketContextValue {
	const context = useContext(GameSocketContext);
	if (!context) throw new Error('useGameSocket must be used within GameSocketProvider');
	return context;
}
