import { createServer } from 'node:http';
import { Server } from 'socket.io';
import type { Express } from 'express';
import { authenticateToken } from './auth';
import type { AuthenticatedUser } from './auth';
import { pool } from './db';
import { findGame, forgetGame, GAME_DURATION_MS, gradeSubmission, onGameCreated, serializeGame } from './service';
import type { GamePlayerState, GameState, Grading, TeamChatMessage, TeamId, Workspace } from './service';

const DEFAULT_JOIN_WAIT_MS = 5_000;
const DEFAULT_RECONNECT_GRACE_MS = 30_000;
const DEFAULT_SUBMIT_COOLDOWN_MS = 5_000;
const DEFAULT_BAN_WINDOW_MS = 30_000;
const DEFAULT_PICK_WINDOW_MS = 30_000;
const MAX_CHAT_LENGTH = 500;
const CHAT_RATE_LIMIT_MS = 1_000;
const CHAT_RETENTION_DAYS = 10;

interface ServerOptions {
	origins?: string[];
	joinWaitMs?: number;
	reconnectGraceMs?: number;
	submitCooldownMs?: number;
	banWindowMs?: number;
	pickWindowMs?: number;
}

// What the auth middleware attaches to every accepted socket.
interface SocketData {
	user: AuthenticatedUser;
	game: GameState;
	player: GamePlayerState;
}

export type EndReason = 'forfeit' | 'disconnect' | 'time' | 'solved';

// What a player sends on `game:submit`.
interface Submission {
	questionId?: unknown;
	code?: unknown;
}

// What a player sends on `game:code`.
interface CodeUpdate {
	questionId?: unknown;
	workspace?: unknown;
}

// One entry of a `game:code:snapshot`: a teammate's saved workspace for one question.
interface WorkspaceSnapshotEntry {
	userId: string;
	displayName: string;
	questionId: number;
	workspace: Workspace;
}

const isEditorTab = (value: unknown): value is Workspace['tabs'][number] => {
	const tab = value as Partial<Workspace['tabs'][number]> | null;
	return typeof tab?.id === 'string' && typeof tab.name === 'string' && typeof tab.code === 'string';
};

const isWorkspace = (value: unknown): value is Workspace => {
	const workspace = value as Partial<Workspace> | null;
	return Array.isArray(workspace?.tabs) && workspace.tabs.every(isEditorTab) && typeof workspace.activeTabId === 'string';
};

interface Ban {
	questionId?: unknown;
}

// The answer to `game:ban`.
type BanResponse = { ok: true } | { error: 'not-banning' | 'unknown-problem' | 'already-banned' | 'problem-banned' };

// What a player sends on `game:pick` (US-6-T-10).
interface PickRequest {
	questionId?: unknown;
}

// The answer to `game:pick`.
type PickResponse = { ok: true } | { error: 'not-picking' | 'unknown-problem' | 'pick-limit-reached' | 'problem-picked' };

// What a player sends on `game:unpick` (US-8-2): gives back one of their own picks.
interface UnpickRequest {
	questionId?: unknown;
}

// The answer to `game:unpick`.
type UnpickResponse = { ok: true } | { error: 'not-picking' | 'unknown-problem' | 'not-picked' };

// The answer to `game:submit`: CodeService's grading, or why it was refused.
type SubmitResponse = Grading | { error: 'not-playing' | 'unknown-problem' | 'team-busy' | 'cooldown' | 'grading-failed' };

// Sent once on `game:ended`. winner is null for a draw.
export interface GameResult {
	winner: TeamId | null;
	reason: EndReason;
}

const otherTeam = (team: TeamId): TeamId => (team === 'a' ? 'b' : 'a');

// A problem's full value by difficulty (US-6-T-8); anything else is worth nothing.
const POINTS_BY_DIFFICULTY: Record<string, number> = { Easy: 150, Medium: 300, Hard: 450 };

// The points a graded submission earns: the percent of testcases it passed,
// of its difficulty's full value, floored to a whole number.
export function pointsForSubmission(difficulty: string, passed: number, total: number): number {
	if (total <= 0) return 0;
	return Math.floor((passed / total) * (POINTS_BY_DIFFICULTY[difficulty] ?? 0));
}

// When the clock runs out, the higher score wins; level scores are a draw.
export function resultOnTime({ a, b }: Record<TeamId, number>): GameResult {
	return { winner: a === b ? null : a > b ? 'a' : 'b', reason: 'time' };
}

// How many problems a player may claim from their team's shared pool
// (US-8-2): the pool rounded up to split evenly across the team, so the
// whole pool is always claimable even when it doesn't divide evenly.
export function pickLimit(poolSize: number, teamSize: number): number {
	return Math.ceil(poolSize / teamSize);
}

// Wraps the Express app in an HTTP server and attaches the socket.io endpoint
// to it, so one port serves both the REST routes and the live game traffic.
//
// Rooms: every player joins `game:<gameId>` (match-wide events such as scores
// and the end of the game) and `game:<gameId>:<team>` (team-only traffic such
// as the shared editor). The team room is picked server-side from the roster
// the lobby sent, so a client can't choose to listen to the other team.
//
// Lifecycle (all server-side timers, never trusted to a client):
//   waiting -> banning  once every player connects, or the join wait runs out
//              (teamSize 2 or 3 only -- see beginMatch)
//   waiting -> playing  same trigger, but straight to playing for a 1v1
//                       (teamSize 1), which never bans or picks
//   banning -> picking  once every player still in the game has banned one
//                       problem, or the ban window runs out
//   picking -> playing  once every player still in the game has picked one
//                       of the problems the bans left, or the pick window
//                       runs out (whoever hasn't picked is auto-assigned)
//   banning/picking/playing -> ended
//                       when a whole team has left; also (playing only) when a
//                       team forfeits, a team solves every problem, or time runs out
export function createGameServer(app: Express, options: ServerOptions = {}) {
	const origins = options.origins ?? (process.env.FRONTEND_URL ?? 'http://localhost:3000')
		.split(',')
		.map((origin) => origin.trim())
		.filter(Boolean);
	const joinWaitMs = options.joinWaitMs ?? DEFAULT_JOIN_WAIT_MS;
	const reconnectGraceMs = options.reconnectGraceMs ?? DEFAULT_RECONNECT_GRACE_MS;
	const submitCooldownMs = options.submitCooldownMs ?? DEFAULT_SUBMIT_COOLDOWN_MS;
	const banWindowMs = options.banWindowMs ?? DEFAULT_BAN_WINDOW_MS;
	const pickWindowMs = options.pickWindowMs ?? DEFAULT_PICK_WINDOW_MS;
	const httpServer = createServer(app);
	const io = new Server(httpServer, { cors: { origin: origins, methods: ['GET', 'POST'] } });
	// The live socket id for each player, so a stale connection (e.g. the tab
	// before a refresh) closing doesn't mark a player disconnected after their
	// replacement socket is already up.
	const socketsByPlayer = new Map<string, string>();
	const liveGames = new Set<GameState>();
	const gameRoom = (game: GameState) => `game:${game.gameId}`;
	const broadcastState = (game: GameState) => io.to(gameRoom(game)).emit('game:state', serializeGame(game));
	const teamOf = (game: GameState, team: TeamId) => [...game.players.values()].filter((player) => player.team === team);

	const clearTimers = (game: GameState) => {
		clearTimeout(game.timers.join);
		clearTimeout(game.timers.ban);
		clearTimeout(game.timers.pick);
		clearTimeout(game.timers.end);
		for (const timer of game.timers.leave.values()) clearTimeout(timer);
		game.timers.leave.clear();
	};

	// Decides the game: sends everyone the final state, persists the end and
	// final scores, tells every player the result, then closes their sockets
	// and forgets the game.
	const endGame = async (game: GameState, result: GameResult) => {
		if (game.phase === 'ended') return;
		// The final scores and solved lists go out first, while the phase is
		// still one clients know, so the result screen counts the last solve
		// (US-4-T-7: it used to show the score from before it).
		broadcastState(game);
		game.phase = 'ended';
		clearTimers(game);
		liveGames.delete(game);
		forgetGame(game.gameId);
		try {
			await pool.query(
				'UPDATE game SET ended_at = NOW(), t1_score = $2, t2_score = $3 WHERE game_id = $1',
				[game.gameId, game.scores.a, game.scores.b],
			);
		} catch (err) {
			console.error('[game-service] failed to persist game end', err);
		}
		// Deletes every game's old team chat, not just this one's. Done before
		// game:ended goes out so it has finished when the players hear the result.
		try {
			await pool.query(
				'DELETE FROM team_messages WHERE sent_at < NOW() - make_interval(days => $1)',
				[CHAT_RETENTION_DAYS],
			);
		} catch (err) {
			console.error('[game-service] failed to delete old chat messages', err);
		}
		io.to(gameRoom(game)).emit('game:ended', result);
		io.in(gameRoom(game)).disconnectSockets(true);
	};

	const endOnTime = (game: GameState) => {
		void endGame(game, resultOnTime(game.scores));
	};

	// Starts the player's reconnect window. If it runs out they count as having
	// left, and a team whose players have all left loses.
	const scheduleLeave = (game: GameState, player: GamePlayerState) => {
		clearTimeout(game.timers.leave.get(player.userId));
		const timer = setTimeout(() => {
			game.timers.leave.delete(player.userId);
			player.left = true;
			if (teamOf(game, player.team).every((teammate) => teammate.left)) {
				void endGame(game, { winner: otherTeam(player.team), reason: 'disconnect' });
				return;
			}
			// A player who left no longer holds up the bans or picks.
			if (game.phase === 'banning' && everyoneBanned(game)) {
				void finishBanning(game);
				return;
			}
			if (game.phase === 'picking' && everyonePicked(game)) {
				void finishPicking(game);
				return;
			}
			broadcastState(game);
		}, reconnectGraceMs);
		timer.unref?.();
		game.timers.leave.set(player.userId, timer);
	};

	// Whether every player still in the game (not left) has made their ban.
	const everyoneBanned = (game: GameState) => [...game.players.values()]
		.every((player) => player.left || game.bans.has(player.userId));

	// Whether every player still in the game (not left) has made their pick.
	const everyonePicked = (game: GameState) => [...game.players.values()]
		.every((player) => player.left || game.picks.has(player.userId));

	// Starts the clock on the problems left after banning (and picking). Clears
	// whatever phase timer is still running, so it's safe to call from either
	// the normal pick-completion path or the pick window running out.
	const enterPlaying = (game: GameState) => {
		clearTimeout(game.timers.ban);
		clearTimeout(game.timers.pick);
		game.phase = 'playing';
		game.banEndsAt = null;
		game.pickEndsAt = null;
		game.startedAt = Date.now();
		game.timers.end = setTimeout(() => endOnTime(game), GAME_DURATION_MS);
		game.timers.end.unref?.();
		broadcastState(game);
	};

	// Starts the bans. Anyone who hasn't connected yet is treated as having
	// just dropped, so they get the usual reconnect window.
	const startBanning = (game: GameState) => {
		if (game.phase !== 'waiting') return;
		clearTimeout(game.timers.join);
		game.phase = 'banning';
		game.banEndsAt = Date.now() + banWindowMs;
		game.timers.ban = setTimeout(() => void finishBanning(game), banWindowMs);
		game.timers.ban.unref?.();
		for (const player of game.players.values()) {
			if (!player.connected) scheduleLeave(game, player);
		}
		broadcastState(game);
	};

	// Begins the match once every player has connected (or the join wait runs
	// out): a 1v1 (team size 1) has no teammate to ban or pick with, so it
	// skips straight to playing on its full pool; every other size bans first.
	const beginMatch = (game: GameState) => {
		if (game.phase !== 'waiting') return;
		const teamSize = [...game.players.values()].length / 2;
		if (teamSize === 1) {
			clearTimeout(game.timers.join);
			enterPlaying(game);
			return;
		}
		startBanning(game);
	};

	// Removes the banned problems from the pool (and from game_problems, so the
	// saved pool always matches the one being played), then moves on to picking.
	const finishBanning = async (game: GameState) => {
		if (game.phase !== 'banning') return;
		clearTimeout(game.timers.ban);
		const banned = new Set(game.bans.values());
		const removed = game.problemPool.filter((problem) => banned.has(problem.questionId));
		game.problemPool = game.problemPool.filter((problem) => !banned.has(problem.questionId));
		game.phase = 'picking';
		game.banEndsAt = null;
		try {
			await pool.query(
				'DELETE FROM game_problems WHERE game_id = $1 AND task_id = ANY($2::text[])',
				[game.gameId, removed.map((problem) => problem.taskId)],
			);
		} catch (err) {
			console.error('[game-service] failed to save the bans', err);
		}
		if (game.phase === 'picking') startPicking(game);
	};

	// Starts the pick window: every player picks one of the problems the bans left.
	const startPicking = (game: GameState) => {
		game.pickEndsAt = Date.now() + pickWindowMs;
		game.timers.pick = setTimeout(() => void finishPicking(game), pickWindowMs);
		game.timers.pick.unref?.();
		broadcastState(game);
	};

	// Auto-assigns whoever picked nothing at all the pool's leftover problems
	// their team hasn't claimed yet, sequentially in pool order, up to their
	// own pick limit (US-8-2), so every player ends the pick phase with
	// problems of their own even if they never clicked one. A player who
	// picked some but not all of their limit is left as they are -- only
	// players with no picks at all are auto-assigned.
	const autoAssignPicks = (game: GameState) => {
		for (const team of ['a', 'b'] as TeamId[]) {
			const teamPlayers = teamOf(game, team);
			const limit = pickLimit(game.problemPool.length, teamPlayers.length);
			const unpicked = teamPlayers.filter((player) => !player.left && !game.picks.has(player.userId));
			if (unpicked.length === 0) continue;
			const claimedByTeam = new Set(
				[...game.picks].filter(([userId]) => game.players.get(userId)?.team === team).flatMap(([, questionIds]) => questionIds),
			);
			const available = game.problemPool.filter((problem) => !claimedByTeam.has(problem.questionId));
			for (const player of unpicked) {
				const assigned: number[] = [];
				while (assigned.length < limit) {
					const next = available.shift();
					if (!next) break;
					assigned.push(next.questionId);
				}
				if (assigned.length > 0) game.picks.set(player.userId, assigned);
			}
		}
	};

	// Moves on to playing once every pick is in, or the pick window runs out
	// (auto-assigning anyone who hasn't picked first).
	const finishPicking = (game: GameState) => {
		if (game.phase !== 'picking') return;
		clearTimeout(game.timers.pick);
		autoAssignPicks(game);
		enterPlaying(game);
	};

	const stopListening = onGameCreated((game) => {
		liveGames.add(game);
		game.timers.join = setTimeout(() => beginMatch(game), joinWaitMs);
		game.timers.join.unref?.();
	});

	io.use(async (socket, next) => {
		let user: AuthenticatedUser;
		try {
			user = await authenticateToken(socket.handshake.auth?.token);
		} catch {
			return next(new Error('unauthorized'));
		}
		const gameId: unknown = socket.handshake.auth?.gameId;
		const game = typeof gameId === 'string' ? findGame(gameId) : undefined;
		const player = game?.players.get(user.id);
		if (!game || !player) return next(new Error('not-in-game'));
		socket.data = { user, game, player } satisfies SocketData;
		next();
	});

	io.on('connection', async (socket) => {
		const { user, game, player } = socket.data as SocketData;
		const playerKey = `${game.gameId}:${user.id}`;
		socketsByPlayer.set(playerKey, socket.id);
		await socket.join([gameRoom(game), `${gameRoom(game)}:${player.team}`]);
		player.connected = true;
		player.left = false;
		clearTimeout(game.timers.leave.get(user.id));
		game.timers.leave.delete(user.id);

		// Hands the joining or reconnecting player their teammates' saved code,
		// so their workspaces can be shown read only even if this player missed
		// the live "game:code" updates. Never includes this player's own
		// workspace or anyone on the other team.
		const snapshot: WorkspaceSnapshotEntry[] = teamOf(game, player.team)
			.filter((teammate) => teammate.userId !== user.id)
			.flatMap((teammate) => [...(game.workspaces.get(teammate.userId) ?? new Map())].map(([questionId, workspace]) => ({
				userId: teammate.userId,
				displayName: teammate.displayName,
				questionId,
				workspace,
			})));
		socket.emit('game:code:snapshot', snapshot);
		// Hands them their team's chat so far in this game, oldest first, so a
		// late join, reconnect or refresh doesn't start from an empty chat.
		socket.emit('chat:history', game.chat[player.team]);

		if (game.phase === 'waiting' && [...game.players.values()].every((entry) => entry.connected)) {
			beginMatch(game);
		} else {
			broadcastState(game);
		}

		// Each player bans one problem from the pool. Picking starts once every
		// player still in the game has banned (or the ban window runs out).
		socket.on('game:ban', (request: Ban, ack?: (_response: BanResponse) => void) => {
			const reply = typeof ack === 'function' ? ack : () => undefined;
			if (game.phase !== 'banning') return reply({ error: 'not-banning' });
			const problem = game.problemPool.find((entry) => entry.questionId === request?.questionId);
			if (!problem) return reply({ error: 'unknown-problem' });
			if (game.bans.has(user.id)) return reply({ error: 'already-banned' });
			if ([...game.bans.values()].includes(problem.questionId)) return reply({ error: 'problem-banned' });

			game.bans.set(user.id, problem.questionId);
			reply({ ok: true });
			if (everyoneBanned(game)) {
				void finishBanning(game);
				return;
			}
			broadcastState(game);
		});

		// Each player picks problems from their own team's pool of choices
		// (US-6-T-10), exclusively assigned to them and no one else on their
		// team (US-8-2), up to their pick limit. Play starts once every player
		// still in the game has picked at least one (or the pick window runs out).
		socket.on('game:pick', (request: PickRequest, ack?: (_response: PickResponse) => void) => {
			const reply = typeof ack === 'function' ? ack : () => undefined;
			if (game.phase !== 'picking') return reply({ error: 'not-picking' });
			const problem = game.problemPool.find((entry) => entry.questionId === request?.questionId);
			if (!problem) return reply({ error: 'unknown-problem' });
			const ownPicks = game.picks.get(user.id) ?? [];
			const limit = pickLimit(game.problemPool.length, teamOf(game, player.team).length);
			if (ownPicks.length >= limit) return reply({ error: 'pick-limit-reached' });
			const pickedByTeammate = teamOf(game, player.team)
				.some((teammate) => (game.picks.get(teammate.userId) ?? []).includes(problem.questionId));
			if (pickedByTeammate) return reply({ error: 'problem-picked' });

			game.picks.set(user.id, [...ownPicks, problem.questionId]);
			reply({ ok: true });
			if (everyonePicked(game)) {
				void finishPicking(game);
				return;
			}
			broadcastState(game);
		});

		// Gives back one of the player's own picks (US-8-2), freeing it for a
		// teammate and leaving room under the player's own limit to pick a
		// different problem instead. Losing their only pick puts the player back
		// to not having picked, same as before they ever clicked one.
		socket.on('game:unpick', (request: UnpickRequest, ack?: (_response: UnpickResponse) => void) => {
			const reply = typeof ack === 'function' ? ack : () => undefined;
			if (game.phase !== 'picking') return reply({ error: 'not-picking' });
			const problem = game.problemPool.find((entry) => entry.questionId === request?.questionId);
			if (!problem) return reply({ error: 'unknown-problem' });
			const ownPicks = game.picks.get(user.id) ?? [];
			if (!ownPicks.includes(problem.questionId)) return reply({ error: 'not-picked' });

			const left = ownPicks.filter((questionId) => questionId !== problem.questionId);
			if (left.length > 0) game.picks.set(user.id, left);
			else game.picks.delete(user.id);
			reply({ ok: true });
			broadcastState(game);
		});

		// Passes a player's editor for one question on to their own team only,
		// so the other team can never receive it. Also saves it as this
		// player's latest workspace for that question, so a teammate who joins
		// or reconnects later still gets it (see "game:code:snapshot" above).
		socket.on('game:code', (update: CodeUpdate) => {
			if (game.phase !== 'playing') return;
			if (!game.problemPool.some((problem) => problem.questionId === update?.questionId)) return;
			if (!isWorkspace(update.workspace)) return;
			const questionId = update.questionId as number;
			const playerWorkspaces = game.workspaces.get(user.id) ?? new Map<number, Workspace>();
			playerWorkspaces.set(questionId, update.workspace);
			game.workspaces.set(user.id, playerWorkspaces);
			socket.to(`${gameRoom(game)}:${player.team}`).emit('game:code', {
				userId: user.id,
				displayName: player.displayName,
				questionId: update.questionId,
				workspace: update.workspace,
			});
		});

		// Team chat (US-3-T-2): saves a player's message to team_messages, then
		// passes it on to their own team, sender included. The game, team and
		// user come from the server's roster and the authenticated socket, never
		// the client. The saved row's id and time are the ones sent out. The sender
		// is answered { ok: true } once the message is out, or { error } if refused.
		socket.on('chat:send', async (message: { text?: unknown }, ack?: (_response: { ok: true } | { error: string }) => void) => {
			const reply = typeof ack === 'function' ? ack : () => undefined;
			if (game.phase === 'ended') return;
			const text = message?.text;
			if (typeof text !== 'string') return;
			if (text.length > MAX_CHAT_LENGTH) return reply({ error: 'Message too long' });
			// Keyed by user, not socket, so a second tab shares the limit. Only
			// accepted messages are recorded, so a rejected one doesn't count.
			const now = Date.now();
			if (now - (game.lastChatAt.get(user.id) ?? 0) < CHAT_RATE_LIMIT_MS) return reply({ error: 'Whoa, slow down!' });
			game.lastChatAt.set(user.id, now);
			let saved: { id: string; sent_at: Date };
			try {
				const { rows } = await pool.query(
					'INSERT INTO team_messages (game_id, team, user_id, text) VALUES ($1, $2, $3, $4) RETURNING id, sent_at',
					[game.gameId, player.team, user.id, text],
				);
				saved = rows[0];
			} catch (err) {
				console.error('[game-service] failed to save a chat message', err);
				return;
			}
			const chatMessage: TeamChatMessage = {
				id: saved.id,
				userId: user.id,
				displayName: player.displayName,
				team: player.team,
				text,
				sentAt: saved.sent_at.toISOString(),
			};
			game.chat[player.team].push(chatMessage);
			io.to(`${gameRoom(game)}:${player.team}`).emit('chat:message', chatMessage);
			reply({ ok: true });
		});

		// A team forfeits once every teammate still in the game has voted to.
		socket.on('game:forfeit', () => {
			if (game.phase !== 'playing') return;
			const votes = game.forfeitVotes[player.team];
			votes.add(user.id);
			const stillIn = teamOf(game, player.team).filter((teammate) => teammate.connected && !teammate.left);
			if (stillIn.every((teammate) => votes.has(teammate.userId))) {
				void endGame(game, { winner: otherTeam(player.team), reason: 'forfeit' });
				return;
			}
			broadcastState(game);
		});

		// Grades a teammate's solution through CodeService. One submission per
		// team at a time, then a cooldown, so a team can't spam the grader. An
		// accepted solution marks the problem solved for the team, and the first
		// team to solve the whole pool wins. Results that land after the game has
		// ended change nothing, since endGame only runs once.
		socket.on('game:submit', async (submission: Submission, ack: (_response: SubmitResponse) => void) => {
			if (typeof ack !== 'function') return;
			if (game.phase !== 'playing') return ack({ error: 'not-playing' });
			const problem = game.problemPool.find((entry) => entry.questionId === submission?.questionId);
			if (!problem) return ack({ error: 'unknown-problem' });
			const { team } = player;
			if (game.submitting[team]) return ack({ error: 'team-busy' });
			if (Date.now() < game.cooldownUntil[team]) return ack({ error: 'cooldown' });

			game.submitting[team] = true;
			let grading: Grading | null;
			try {
				grading = await gradeSubmission(problem.questionId, String(submission.code ?? ''));
			} catch {
				grading = null;
			} finally {
				game.submitting[team] = false;
				game.cooldownUntil[team] = Date.now() + submitCooldownMs;
			}
			if (!grading) return ack({ error: 'grading-failed' });

			// A team is only credited once per problem, for the best score it has
			// reached on it; resubmitting for fewer points changes nothing.
			const points = pointsForSubmission(problem.difficulty, grading.passed, grading.total);
			const bestForTeam = game.bestScore[team];
			const previousBest = bestForTeam.get(problem.taskId) ?? 0;
			if (points > previousBest) {
				game.scores[team] += points - previousBest;
				bestForTeam.set(problem.taskId, points);
			}
			try {
				await pool.query(
					'INSERT INTO submissions (game_id, user_id, task_id, test_cases_passed, test_cases_total, points_awarded) VALUES ($1, $2, $3, $4, $5, $6)',
					[game.gameId, user.id, problem.taskId, grading.passed, grading.total, points],
				);
			} catch (err) {
				console.error('[game-service] failed to save the submission', err);
			}

			if (grading.verdict === 'Accepted') game.solved[team].add(problem.taskId);
			ack(grading);
			if (game.solved[team].size === game.problemPool.length) {
				void endGame(game, { winner: team, reason: 'solved' });
				return;
			}
			broadcastState(game);
		});

		socket.on('disconnect', () => {
			if (socketsByPlayer.get(playerKey) !== socket.id) return;
			socketsByPlayer.delete(playerKey);
			if (game.phase === 'ended') return;
			player.connected = false;
			if (game.phase === 'banning' || game.phase === 'picking' || game.phase === 'playing') scheduleLeave(game, player);
			broadcastState(game);
		});
	});

	return {
		httpServer,
		io,
		close: () => new Promise<void>((resolve) => {
			stopListening();
			for (const game of liveGames) clearTimers(game);
			io.close(() => resolve());
		}),
	};
}
