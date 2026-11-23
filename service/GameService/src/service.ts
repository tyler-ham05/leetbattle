import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { pool } from './db';
import { authenticateToken } from './auth';

export const GAME_DURATION_MS = 20 * 60 * 1000;
const CODE_SERVICE_URL = process.env.CODE_SERVICE_URL ?? 'http://localhost:4001';
// Where clients open this service's WebSocket (US-6-T-8 hands it out so a
// player can rejoin). Read per request so a deployment can set it at start-up.
const gameSocketUrl = () => process.env.GAME_SOCKET_URL ?? 'http://localhost:4004';

const readyPlayerSchema = z.object({
	userId: z.uuid(),
	displayName: z.string().trim().min(1).max(24),
	team: z.enum(['a', 'b']),
});

// The lobby host picks 1v1, 2v2 or 3v3, so a match is 2 to 6 players with
// the same number on each team.
const startGameBodySchema = z.object({
	players: z.array(readyPlayerSchema).min(2).max(6),
}).refine(
	(body) => body.players.filter((player) => player.team === 'a').length * 2 === body.players.length,
	{ message: 'players must be split evenly across team a and team b' },
);

export type TeamId = 'a' | 'b';

// One accepted team chat message, as sent on `chat:message` and `chat:history`.
export interface TeamChatMessage {
	id: string;
	userId: string;
	displayName: string;
	team: TeamId;
	text: string;
	sentAt: string;
}

// One problem in a match's pool. game_problems saves only the task_id; the
// question_id is what CodeService's GET /problem/:questionId looks it up by,
// so the game page can load the full problem from the pool alone. topics are
// CodeService's tags: all the ban screen shows of a problem.
export interface PoolProblem {
	taskId: string;
	questionId: number;
	difficulty: string;
	topics: string[];
}

// One tab of a player's editor, as the practice editor keeps it.
export interface EditorTab {
	id: string;
	name: string;
	code: string;
}

// A player's editor for one question: their tabs and which one is open.
export interface Workspace {
	tabs: EditorTab[];
	activeTabId: string;
}

export interface GamePlayerState {
	userId: string;
	displayName: string;
	team: TeamId;
	connected: boolean;
	left: boolean; // dropped and didn't reconnect within the window (see src/server.ts)
}

// waiting: created, waiting for players to connect (the clock hasn't started)
// banning: every player bans one problem from the pool (the clock hasn't started)
// picking: every player picks one of the problems the bans left (the clock hasn't started)
// playing: the 20-minute clock is running on the problems left after banning (and picking)
// ended:   decided; about to be torn down
// US-6-T-10: a 1v1 (team size 1) skips "banning" and "picking" entirely, going
// straight from "waiting" to "playing" on its full, un-banned pool -- there's
// no teammate to coordinate a ban or a pick with.
export type GamePhase = 'waiting' | 'banning' | 'picking' | 'playing' | 'ended';

export interface GameState {
	gameId: string;
	phase: GamePhase;
	startedAt: number | null; // Date.now() when play began; used to compute time remaining
	scores: Record<TeamId, number>; // live counterpart of game.t1_score / t2_score
	players: Map<string, GamePlayerState>; // keyed by userId
	// Problems assigned to this game (task_ids saved in game_problems). All nine
	// until play starts, then only the ones the bans left.
	problemPool: PoolProblem[];
	bans: Map<string, number>; // userId -> questionId that player banned
	banEndsAt: number | null; // Date.now() when the ban window runs out; null outside the ban phase
	picks: Map<string, number>; // userId -> questionId that player picked (US-6-T-10)
	pickEndsAt: number | null; // Date.now() when the pick window runs out; null outside the pick phase
	selections: Map<string, string>; // userId -> task_id currently being worked (player_selections)
	// Every player's last-shared editor, kept so a player who joins or
	// reconnects mid-match can be shown their teammates' workspaces read only
	// (see "game:code:snapshot" in src/server.ts), not just live updates.
	workspaces: Map<string, Map<number, Workspace>>; // userId -> questionId -> workspace
	forfeitVotes: Record<TeamId, Set<string>>; // userIds on each team who chose to forfeit
	solved: Record<TeamId, Set<string>>; // task_ids each team has had accepted
	// The best points a team has reached on each problem (see pointsForSubmission
	// in src/server.ts): resubmitting only raises the team's score if it beats this.
	bestScore: Record<TeamId, Map<string, number>>; // task_id -> points
	// The per-team submit lock (see `game:submit` in src/server.ts): whether a
	// submission is being graded, and when the team may next submit.
	submitting: Record<TeamId, boolean>;
	cooldownUntil: Record<TeamId, number>;
	// When each player's last team chat message was accepted (see `chat:send`
	// in src/server.ts), so a player can send at most one message per second.
	lastChatAt: Map<string, number>; // userId -> Date.now()
	// Every accepted team chat message so far, per team, oldest first. Sent as
	// `chat:history` to a player who joins or reconnects (see src/server.ts).
	chat: Record<TeamId, TeamChatMessage[]>;
	// Server-side timers driving the match - all owned by src/server.ts.
	timers: {
		join?: NodeJS.Timeout; // ends the join wait
		ban?: NodeJS.Timeout; // ends the ban window
		pick?: NodeJS.Timeout; // ends the pick window
		end?: NodeJS.Timeout; // ends the match when the clock runs out
		leave: Map<string, NodeJS.Timeout>; // userId -> ends that player's reconnect window
	};
}

const games = new Map<string, GameState>();
const createdListeners = new Set<(_game: GameState) => void>();

// The live state for a game this process started, if it is still running.
export function findGame(gameId: string): GameState | undefined {
	return games.get(gameId);
}

// Stops tracking a game once it has ended.
export function forgetGame(gameId: string): void {
	games.delete(gameId);
}

// Lets the socket server start each new game's timers. Returns an unsubscribe.
export function onGameCreated(listener: (_game: GameState) => void): () => void {
	createdListeners.add(listener);
	return () => createdListeners.delete(listener);
}

// Who banned the problem with `questionId`, as the ban screen shows it, or null.
function bannedBy(game: GameState, questionId: number) {
	for (const [userId, banned] of game.bans) {
		const player = game.players.get(userId);
		if (banned === questionId && player) return { userId, displayName: player.displayName, team: player.team };
	}
	return null;
}

// Who on each team has picked the problem with `questionId`, as the pick
// screen shows it (US-6-T-10). Each team picks independently from the same
// pool left after banning, so a problem can show up to one picker per team.
function pickedBy(game: GameState, questionId: number): Record<TeamId, { userId: string; displayName: string; team: TeamId } | null> {
	const result: Record<TeamId, { userId: string; displayName: string; team: TeamId } | null> = { a: null, b: null };
	for (const [userId, picked] of game.picks) {
		if (picked !== questionId) continue;
		const player = game.players.get(userId);
		if (player) result[player.team] = { userId, displayName: player.displayName, team: player.team };
	}
	return result;
}

const secondsUntil = (time: number) => Math.max(0, Math.ceil((time - Date.now()) / 1000));

// The wire form of a GameState for the `game:state` socket event: everything
// a client needs to render the match, minus server-only timers and who voted.
export function serializeGame(game: GameState) {
	return {
		gameId: game.gameId,
		phase: game.phase,
		startedAt: game.startedAt,
		secondsRemaining: secondsUntil((game.startedAt ?? Date.now()) + GAME_DURATION_MS),
		banSecondsRemaining: game.banEndsAt === null ? 0 : secondsUntil(game.banEndsAt),
		pickSecondsRemaining: game.pickEndsAt === null ? 0 : secondsUntil(game.pickEndsAt),
		scores: game.scores,
		problemPool: game.problemPool.map((problem) => ({
			...problem,
			bannedBy: bannedBy(game, problem.questionId),
			pickedBy: pickedBy(game, problem.questionId),
		})),
		players: [...game.players.values()],
		forfeitVotes: { a: game.forfeitVotes.a.size, b: game.forfeitVotes.b.size },
		solved: { a: [...game.solved.a], b: [...game.solved.b] },
	};
}

class HttpError extends Error {
	status: number;

	constructor(status: number, message: string) {
		super(message);
		this.status = status;
	}
}

// The shared problem pool for a new match: 2*teamSize Easy + teamSize Medium
// questions from CodeService's GET /problem?difficulty=&quantity= endpoint
// (9/6/3 for a 3v3/2v2/1v1 -- US-6-T-10). Both teams draw from the same pool
// (see game_problems in sql/schema.sql).
// Any failure here (an error status, or CodeService not answering at all)
// becomes a 502, since it's an upstream problem rather than a bad request.
async function fetchProblemPool(teamSize: number): Promise<PoolProblem[]> {
	const unavailable = new HttpError(502, 'could not load the problem pool from CodeService');
	// The fetch Response, not Express's Response imported at the top of this file.
	let responses: globalThis.Response[];
	try {
		responses = await Promise.all([
			fetch(`${CODE_SERVICE_URL}/problem?difficulty=Easy&quantity=${teamSize * 2}`),
			fetch(`${CODE_SERVICE_URL}/problem?difficulty=Medium&quantity=${teamSize}`),
		]);
	} catch {
		throw unavailable;
	}
	if (responses.some((response) => !response.ok)) throw unavailable;
	const [easyProblems, mediumProblems] = await Promise.all(
		responses.map((response) => response.json() as Promise<{ task_id: string; question_id: number; difficulty: string; tags?: string[] }[]>),
	);
	return [...easyProblems, ...mediumProblems].map((problem) => ({
		taskId: problem.task_id,
		questionId: problem.question_id,
		difficulty: problem.difficulty,
		topics: problem.tags ?? [],
	}));
}

// Saves the game, its players, their teams and its problem pool in one
// statement. Postgres applies a statement all-or-nothing, so if any part
// fails (e.g. the same player listed twice) no half-made game is left behind.
// The foreign keys between these tables are checked at the end of the
// statement, so writing parent and child rows together is allowed.
const SAVE_GAME_SQL = `
	WITH new_game AS (
		INSERT INTO game DEFAULT VALUES RETURNING game_id
	), roster AS (
		SELECT * FROM unnest($1::uuid[], $2::text[], $3::text[]) AS r(user_id, display_name, team)
	), new_players AS (
		INSERT INTO players (game_id, user_id, display_name)
		SELECT new_game.game_id, roster.user_id, roster.display_name FROM new_game, roster
	), new_teams AS (
		INSERT INTO player_teams (game_id, user_id, team)
		SELECT new_game.game_id, roster.user_id, roster.team FROM new_game, roster
	), new_problems AS (
		INSERT INTO game_problems (game_id, task_id)
		SELECT new_game.game_id, pool.task_id FROM new_game, unnest($4::text[]) AS pool(task_id)
	)
	SELECT game_id FROM new_game`;

export function getRoot(_req: Request, res: Response) {
	res.json({
		service: 'game-service',
		message: 'Hello from game-service',
	});
}

// Called once LobbyService's countdown fires (lobby:ready-for-match). Takes the
// ready players (1v1 to 3v3) + their teams, and:
//   - picks the shared problem pool from CodeService first, so nothing is
//     saved if that fails
//   - INSERTs the `game` row (started_at defaults to NOW(), ended_at stays null),
//     matching `players` / `player_teams` rows and `game_problems`, all in one
//     statement (see SAVE_GAME_SQL)
//   - creates the in-memory GameState for this game_id (scores, timer, picks)
//     and hands it to the socket server, which runs the join wait and the clock
// Responds with { gameId } so the frontend can navigate to /game/[gameId].
export async function createGame(req: Request, res: Response, next: NextFunction) {
	const body = startGameBodySchema.safeParse(req.body);
	if (!body.success) {
		return next(new HttpError(400, 'players must be 2 to 6 entries split evenly across teams a and b'));
	}
	const { players } = body.data;
	// Validated above to be an even split, so this is each team's size (1 to 3).
	const teamSize = players.filter((player) => player.team === 'a').length;

	try {
		const problemPool = await fetchProblemPool(teamSize);
		const gameResult = await pool.query<{ game_id: string }>(SAVE_GAME_SQL, [
			players.map((player) => player.userId),
			players.map((player) => player.displayName),
			players.map((player) => player.team),
			problemPool.map((problem) => problem.taskId),
		]);
		const gameId = gameResult.rows[0].game_id;

		const game: GameState = {
			gameId,
			phase: 'waiting',
			startedAt: null,
			scores: { a: 0, b: 0 },
			players: new Map(players.map((player) => [player.userId, { ...player, connected: false, left: false }])),
			problemPool,
			bans: new Map(),
			banEndsAt: null,
			picks: new Map(),
			pickEndsAt: null,
			selections: new Map(),
			workspaces: new Map(),
			forfeitVotes: { a: new Set(), b: new Set() },
			solved: { a: new Set(), b: new Set() },
			bestScore: { a: new Map(), b: new Map() },
			submitting: { a: false, b: false },
			cooldownUntil: { a: 0, b: 0 },
			lastChatAt: new Map(),
			chat: { a: [], b: [] },
			timers: { leave: new Map() },
		};
		games.set(gameId, game);
		for (const listener of createdListeners) listener(game);

		res.status(201).json({ gameId });
	} catch (err) {
		next(err);
	}
}

// Fetches a single game's current state for the /game/[gameId] page (initial
// load or reconnect after a dropped socket)
// US-6-T-8: the caller's own active match, with what the client needs to
// rejoin it. Only the logged-in player may look up their own match: the
// Bearer token must be valid (401) and belong to the :id asked about (403).
export async function getGame(req: Request, res: Response, next: NextFunction) {
	const { id: userId } = req.params;
	let callerId: string;
	try {
		callerId = (await authenticateToken(req.headers.authorization?.replace(/^Bearer /, ''))).id;
	} catch {
		return next(new HttpError(401, 'a valid login token is required'));
	}
	if (callerId !== userId) {
		return next(new HttpError(403, 'you can only look up your own match'));
	}
	try {
		const result = await pool.query<{ game_id: string }>(
			`SELECT game.game_id FROM game
			 JOIN players ON players.game_id = game.game_id
			 WHERE players.user_id = $1 AND game.ended_at IS NULL
			 ORDER BY game.started_at DESC`,
			[userId],
		);
		// A restart (e.g. a deploy) forgets the matches this service was running
		// but leaves their rows without an ended_at, and a socket can't join
		// those. Only a match still running here can be rejoined.
		const live = result.rows.find((row) => findGame(row.game_id));
		if (!live) {
			return next(new HttpError(404, 'no active game for that player'));
		}
		const gameId = live.game_id;
		res.json({ gameId, socketUrl: gameSocketUrl(), gameRoute: `/game/${gameId}` });
	} catch (err) {
		next(err);
	}
}

// CodeService's answer to POST /solution/:questionId.
export interface Grading {
	verdict: string;
	passed: number;
	total: number;
}

// Has CodeService grade a solution. Throws if CodeService fails or can't be
// reached, so the caller can refuse the submission.
export async function gradeSubmission(questionId: number, code: string): Promise<Grading> {
	const response = await fetch(`${CODE_SERVICE_URL}/solution/${questionId}`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ code }),
	});
	if (!response.ok) throw new Error(`CodeService answered ${response.status}`);
	return response.json() as Promise<Grading>;
}

// Invoked when CodeService reports a scored submission for a player in an
// active game. Inserts a `submissions` row, recomputes that team's score from
// the submission's points_awarded, and updates both the in-memory GameState
// and the `game.t1_score` / `t2_score` cache columns so they can't drift.
// Also broadcasts the new score to the game's socket.io room.
// export async function recordSubmission(req: Request, res: Response, next: NextFunction) {}
// export async function handleSubmission(req: Request, res:Response, next: NextFunction)

// Updates `player_selections` when a player switches which problem they're
// working on. Upserts the one active row per (game_id, user_id).
// export async function selectProblem(req: Request, res: Response, next: NextFunction) {}
// export async function 

// Ending a game (setting `ended_at`, persisting final scores, tearing down the
// in-memory GameState and timers, and emitting "game:ended") is `endGame` in
// src/server.ts, since it's driven by the server-side timers and socket events.
