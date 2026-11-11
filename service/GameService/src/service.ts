import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { pool } from './db';

const GAME_DURATION_MS = 20 * 60 * 1000;

const readyPlayerSchema = z.object({
	userId: z.uuid(),
	displayName: z.string().trim().min(1).max(24),
	team: z.enum(['a', 'b']),
});

const startGameBodySchema = z.object({
	players: z.array(readyPlayerSchema).length(6),
}).refine(
	(body) => body.players.filter((player) => player.team === 'a').length === 3,
	{ message: 'players must be split 3/3 across team a and team b' },
);

export type TeamId = 'a' | 'b';

export interface GamePlayerState {
	userId: string;
	displayName: string;
	team: TeamId;
	connected: boolean;
}

export interface GameState {
	gameId: string;
	startedAt: number; // Date.now() at creation; used to compute time remaining
	endTimer: NodeJS.Timeout; // server-side authority for ending the match - see scheduleGameEnd
	scores: Record<TeamId, number>; // live counterpart of game.t1_score / t2_score
	players: Map<string, GamePlayerState>; // keyed by userId
	problemPool: string[]; // task_ids assigned to this game (game_problems)
	selections: Map<string, string>; // userId -> task_id currently being worked (player_selections)
}

const games = new Map<string, GameState>();

class HttpError extends Error {
	status: number;

	constructor(status: number, message: string) {
		super(message);
		this.status = status;
	}
}

export function getRoot(_req: Request, res: Response) {
	res.json({
		service: 'game-service',
		message: 'Hello from game-service',
	});
}

// Called once LobbyService's countdown fires (lobby:ready-for-match). Takes the
// six ready players + their teams, and:
//   - INSERTs the `game` row (started_at defaults to NOW(), ended_at stays null)
//   - INSERTs matching rows into `players` / `player_teams` for all six
//   - picks the shared problem pool and INSERTs into `game_problems`
//   - creates the in-memory GameState for this game_id (scores, timer, picks)
//     and starts the match-duration timer (see scheduleGameEnd)
// Responds with { gameId } so the frontend can navigate to /game/[gameId].
export async function createGame(req: Request, res: Response, next: NextFunction) {
	const body = startGameBodySchema.safeParse(req.body);
	if (!body.success) {
		return next(new HttpError(400, 'players must be exactly six entries split 3/3 across teams a and b'));
	}
	const { players } = body.data;

	try {
		const gameResult = await pool.query<{ game_id: string }>(
			'INSERT INTO game DEFAULT VALUES RETURNING game_id',
		);
		const gameId = gameResult.rows[0].game_id;

		for (const player of players) {
			await pool.query(
				'INSERT INTO players (game_id, user_id, display_name) VALUES ($1, $2, $3)',
				[gameId, player.userId, player.displayName],
			);
			await pool.query(
				'INSERT INTO player_teams (game_id, user_id, team) VALUES ($1, $2, $3)',
				[gameId, player.userId, player.team],
			);
		}

		const endTimer = setTimeout(() => {
			games.delete(gameId);
			void pool.query('UPDATE game SET ended_at = NOW() WHERE game_id = $1', [gameId]).catch((err: unknown) => {
				console.error('[game-service] failed to persist game end', err);
			});
		}, GAME_DURATION_MS);
		endTimer.unref?.();

		games.set(gameId, {
			gameId,
			startedAt: Date.now(),
			endTimer,
			scores: { a: 0, b: 0 },
			players: new Map(players.map((player) => [player.userId, { ...player, connected: false }])),
			problemPool: [],
			selections: new Map(),
		});

		res.status(201).json({ gameId });
	} catch (err) {
		next(err);
	}
}

// Fetches a single game's current state for the /game/[gameId] page (initial
// load or reconnect after a dropped socket). Prefers the in-memory GameState
// when this game_id is still live (cheap, has the authoritative scores/picks);
// falls back to a DB read (game + players + player_teams + submissions) once
// ended_at is set and the in-memory state has been torn down.
export async function getGame(req: Request, res: Response, next: NextFunction) {
	const { id: userId } = req.params;
	try {
		const result = await pool.query<{ game_id: string }>(
			`SELECT game.game_id FROM game
			 JOIN players ON players.game_id = game.game_id
			 WHERE players.user_id = $1 AND game.ended_at IS NULL
			 ORDER BY game.started_at ASC
			 LIMIT 1`,
			[userId],
		);
		if (result.rows.length === 0) {
			return next(new HttpError(404, 'no active game for that player'));
		}
		res.json({ gameId: result.rows[0].game_id });
	} catch (err) {
		next(err);
	}
}

// Invoked when CodeService reports a scored submission for a player in an
// active game. Inserts a `submissions` row, recomputes that team's score from
// the submission's points_awarded, and updates both the in-memory GameState
// and the `game.t1_score` / `t2_score` cache columns so they can't drift.
// Also broadcasts the new score to the game's socket.io room.
// export async function recordSubmission(req: Request, res: Response, next: NextFunction) {}

// Updates `player_selections` when a player switches which problem they're
// working on. Upserts the one active row per (game_id, user_id).
// export async function selectProblem(req: Request, res: Response, next: NextFunction) {}

// Not an HTTP handler - called by the per-game setTimeout started in
// createGame (mirrors LobbyService's countdown pattern: server-side timer is
// the sole authority, never trusted to a client). Sets `ended_at`, persists
// final scores, tears down the in-memory GameState/timer for this game_id,
// and emits a final "game:ended" event to the game's socket.io room.
// async function scheduleGameEnd(gameId: string) {}
