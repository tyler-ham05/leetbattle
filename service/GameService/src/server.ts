import { createServer } from 'node:http';
import { Server } from 'socket.io';
import type { Express } from 'express';
import { authenticateToken } from './auth';
import type { AuthenticatedUser } from './auth';
import { pool } from './db';
import { findGame, forgetGame, GAME_DURATION_MS, gradeSubmission, MATCH_FORMAT, onGameCreated, serializeGame, teamRoster, teamSizeOf, TEAMS } from './service';
import type { GamePlayerState, GameState, Grading, TeamChatMessage, TeamId, Workspace } from './service';

// How long a new game waits for its players before the clock starts anyway.
const DEFAULT_JOIN_WAIT_MS = 5_000;
// How long a dropped player has to reconnect before they count as having left.
const DEFAULT_RECONNECT_GRACE_MS = 30_000;
// How long a team must wait after a submission is graded before submitting
// again, so teams can't spam CodeService's grading functions.
const DEFAULT_SUBMIT_COOLDOWN_MS = 5_000;
// The ban and pick windows, and how long the bans are shown once the votes
// close, all come from the match format (US-8-T-1), so a later game mode
// changes them in one place. Tests override them through ServerOptions.

// The longest team chat message GameService accepts, in characters.
const MAX_CHAT_LENGTH = 500;
// The shortest time between two team chat messages from the same player.
const CHAT_RATE_LIMIT_MS = 1_000;
// How long team chat messages are kept before they are deleted, in days.
const CHAT_RETENTION_DAYS = 10;

interface ServerOptions {
	origins?: string[];
	joinWaitMs?: number;
	reconnectGraceMs?: number;
	submitCooldownMs?: number;
	banWindowMs?: number;
	banRevealMs?: number;
	pickWindowMs?: number;
	// How one of several equally-voted questions is chosen (US-8-T-1). Random
	// in a real match; a test can pass a fixed choice so a tie is predictable.
	choose?: Chooser;
}

// Picks one of several equally-good candidates.
export type Chooser = <T>(_choices: T[]) => T;

const chooseAtRandom: Chooser = (choices) => choices[Math.floor(Math.random() * choices.length)];

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

// The answer to `game:ban`, which records a vote (US-8-T-1). A player may move
// their vote freely, so voting twice is not an error; a player whose reconnect
// window ran out during the bans is answered "vote-locked", since the vote they
// left behind has already been counted for their team.
type BanResponse = { ok: true } | { error: 'not-banning' | 'unknown-problem' | 'vote-locked' };

// What a player sends on `game:pick` (US-6-T-10).
interface PickRequest {
	questionId?: unknown;
}

// The answer to `game:pick`.
type PickResponse = { ok: true } | { error: 'not-picking' | 'unknown-problem' | 'already-picked' | 'problem-picked' };

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

// US-7-T-1: what AuthService needs to rate a finished match: the winner (null
// for a draw) and every player on the roster with their team, including
// anyone who left mid-match.
export function matchResultReport(game: GameState, result: GameResult) {
	return {
		gameId: game.gameId,
		winner: result.winner,
		players: [...game.players.values()].map(({ userId, team }) => ({ userId, team })),
	};
}

// US-7-T-1: sends a finished match to AuthService, which updates every
// player's rating and record. Read per call so tests and deployments can set
// them. A failure is only logged: the match has already ended for the players.
async function reportMatchResult(game: GameState, result: GameResult): Promise<void> {
	const authServiceUrl = process.env.AUTH_SERVICE_URL ?? 'http://localhost:4002';
	try {
		const response = await fetch(`${authServiceUrl}/internal/match-results`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.INTERNAL_API_KEY ?? ''}` },
			body: JSON.stringify(matchResultReport(game, result)),
		});
		if (!response.ok) console.error(`[game-service] AuthService refused the match result (${response.status})`);
	} catch (err) {
		console.error('[game-service] could not report the match result to AuthService', err);
	}
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
//   waiting -> banning  once every player connects, or the join wait runs out;
//                       every match size bans, a 1v1 included (US-8-T-1)
//   banning             the votes stay open for the whole ban window, then the
//                       server resolves them and holds the ban screen for the
//                       reveal (see closeBanWindow / finishBanReveal)
//   banning -> picking  once the reveal is over
//   banning -> playing  once the reveal is over in a 1v1 (teamSize 1), which
//                       has no teammate to coordinate a pick with (US-6-T-10)
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
	const banWindowMs = options.banWindowMs ?? MATCH_FORMAT.banWindowMs;
	const banRevealMs = options.banRevealMs ?? MATCH_FORMAT.banRevealMs;
	const pickWindowMs = options.pickWindowMs ?? MATCH_FORMAT.pickWindowMs;
	const choose = options.choose ?? chooseAtRandom;
	const httpServer = createServer(app);
	const io = new Server(httpServer, { cors: { origin: origins, methods: ['GET', 'POST'] } });
	// The live socket id for each player, so a stale connection (e.g. the tab
	// before a refresh) closing doesn't mark a player disconnected after their
	// replacement socket is already up.
	const socketsByPlayer = new Map<string, string>();
	const liveGames = new Set<GameState>();
	const gameRoom = (game: GameState) => `game:${game.gameId}`;
	const teamRoom = (game: GameState, team: TeamId) => `${gameRoom(game)}:${team}`;
	// One copy per team, since a team only ever sees its own ban votes
	// (US-8-T-1). Every player is in exactly one team room, so this reaches
	// everyone in the match exactly once.
	const broadcastState = (game: GameState) => {
		for (const team of TEAMS) io.to(teamRoom(game, team)).emit('game:state', serializeGame(game, team));
	};
	const teamOf = (game: GameState, team: TeamId) => teamRoster(game, team);

	const clearTimers = (game: GameState) => {
		clearTimeout(game.timers.join);
		clearTimeout(game.timers.ban);
		clearTimeout(game.timers.banReveal);
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
		// Not awaited: the players hear the result whether or not AuthService answers.
		void reportMatchResult(game, result);
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
			// The bans always run their full window, so a player who left never
			// hurries them along. The vote they left behind is now fixed: it
			// still counts for their team, and they cannot move it if they come
			// back (US-8-T-1).
			if (game.phase === 'banning') game.voteLocked.add(player.userId);
			// A player who left no longer holds up the picks.
			if (game.phase === 'picking' && everyonePicked(game)) {
				void finishPicking(game);
				return;
			}
			broadcastState(game);
		}, reconnectGraceMs);
		timer.unref?.();
		game.timers.leave.set(player.userId, timer);
	};

	// Whether every player still in the game (not left) has made their pick.
	const everyonePicked = (game: GameState) => [...game.players.values()]
		.every((player) => player.left || game.picks.has(player.userId));

	// Starts the clock on the problems left after banning (and picking). Clears
	// whatever phase timer is still running, so it's safe to call from either
	// the normal pick-completion path or the pick window running out.
	const enterPlaying = (game: GameState) => {
		clearTimeout(game.timers.ban);
		clearTimeout(game.timers.banReveal);
		clearTimeout(game.timers.pick);
		game.phase = 'playing';
		game.banEndsAt = null;
		game.banRevealEndsAt = null;
		game.pickEndsAt = null;
		game.startedAt = Date.now();
		game.timers.end = setTimeout(() => endOnTime(game), GAME_DURATION_MS);
		game.timers.end.unref?.();
		broadcastState(game);
	};

	// Starts the vote. Anyone who hasn't connected yet is treated as having
	// just dropped, so they get the usual reconnect window.
	const startBanning = (game: GameState) => {
		if (game.phase !== 'waiting') return;
		clearTimeout(game.timers.join);
		game.phase = 'banning';
		game.banEndsAt = Date.now() + banWindowMs;
		game.timers.ban = setTimeout(() => void closeBanWindow(game), banWindowMs);
		game.timers.ban.unref?.();
		for (const player of game.players.values()) {
			if (!player.connected) scheduleLeave(game, player);
		}
		broadcastState(game);
	};

	// The questions `team` could lose: the ones its own votes are piled highest
	// on, counting only questions still in the pool, so a question the other
	// team has already banned never swallows a team's ban. A team with no
	// usable votes could lose any question still in the pool.
	const banCandidates = (game: GameState, team: TeamId) => {
		const tally = new Map<number, number>();
		for (const player of teamRoster(game, team)) {
			const voted = game.banVotes.get(player.userId);
			if (voted === undefined) continue;
			if (!game.problemPool.some((problem) => problem.questionId === voted)) continue;
			tally.set(voted, (tally.get(voted) ?? 0) + 1);
		}
		const most = Math.max(0, ...tally.values());
		if (most === 0) return [...game.problemPool];
		return game.problemPool.filter((problem) => tally.get(problem.questionId) === most);
	};

	// Resolves the vote, once, when the window closes: one round per ban a team
	// gets, the teams taken in a random order each round, and each team losing
	// one of its candidates. A tie, a team that did not vote and both teams
	// voting for the same question all settle here, by `choose` alone.
	const resolveBans = (game: GameState) => {
		// The pool as it stood before any ban, so a banned question keeps the
		// place it had on the ban screen through the reveal.
		const positions = new Map(game.problemPool.map((problem, i) => [problem.questionId, i + 1]));
		for (let round = 0; round < MATCH_FORMAT.bansPerTeam; round += 1) {
			const first = choose([...TEAMS]);
			for (const team of [first, otherTeam(first)]) {
				const candidates = banCandidates(game, team);
				if (candidates.length === 0) continue;
				const banned = choose(candidates);
				game.bannedProblems.push({ problem: banned, team, position: positions.get(banned.questionId) ?? 0 });
				game.problemPool = game.problemPool.filter((problem) => problem !== banned);
			}
		}
	};

	// Ends the reveal: the banned questions are dropped from the match state,
	// which only carried them while the ban screen was showing them, and the
	// match moves on. A 1v1 goes straight to playing (US-6-T-10).
	const finishBanReveal = (game: GameState) => {
		if (game.phase !== 'banning') return;
		clearTimeout(game.timers.banReveal);
		game.bannedProblems = [];
		game.banRevealEndsAt = null;
		if (teamSizeOf(game) === 1) {
			enterPlaying(game);
			return;
		}
		game.phase = 'picking';
		startPicking(game);
	};

	// Closes the vote when the ban window runs out: the server resolves it (a
	// client can never remove a question), holds the ban screen for the reveal,
	// and deletes the banned questions from game_problems, so the saved pool
	// always matches the one being played.
	const closeBanWindow = async (game: GameState) => {
		if (game.phase !== 'banning' || game.banRevealEndsAt !== null) return;
		clearTimeout(game.timers.ban);
		resolveBans(game);
		game.banEndsAt = null;
		game.banRevealEndsAt = Date.now() + banRevealMs;
		game.timers.banReveal = setTimeout(() => finishBanReveal(game), banRevealMs);
		game.timers.banReveal.unref?.();
		broadcastState(game);
		try {
			await pool.query(
				'DELETE FROM game_problems WHERE game_id = $1 AND task_id = ANY($2::text[])',
				[game.gameId, game.bannedProblems.map((banned) => banned.problem.taskId)],
			);
		} catch (err) {
			console.error('[game-service] failed to save the bans', err);
		}
	};

	// Starts the pick window: every player picks one of the problems the bans left.
	const startPicking = (game: GameState) => {
		game.pickEndsAt = Date.now() + pickWindowMs;
		game.timers.pick = setTimeout(() => void finishPicking(game), pickWindowMs);
		game.timers.pick.unref?.();
		broadcastState(game);
	};

	// Auto-assigns whoever hasn't picked the problem(s) their team hasn't
	// claimed yet, in pool order, so every player ends the pick phase with
	// exactly one problem of their own even if they never clicked one.
	const autoAssignPicks = (game: GameState) => {
		for (const team of ['a', 'b'] as TeamId[]) {
			const unpicked = teamOf(game, team).filter((player) => !player.left && !game.picks.has(player.userId));
			if (unpicked.length === 0) continue;
			const pickedByTeam = new Set(
				[...game.picks].filter(([userId]) => game.players.get(userId)?.team === team).map(([, questionId]) => questionId),
			);
			const available = game.problemPool.filter((problem) => !pickedByTeam.has(problem.questionId));
			for (const player of unpicked) {
				const next = available.shift();
				if (next) game.picks.set(player.userId, next.questionId);
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
		game.timers.join = setTimeout(() => startBanning(game), joinWaitMs);
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
			startBanning(game);
		} else {
			broadcastState(game);
		}

		// Each player votes for one question and may move that vote until the
		// window closes (US-8-T-1). Nothing leaves the pool here: the server
		// tallies each team's votes when the window closes (closeBanWindow),
		// so a client can never ban a question itself. Two teammates voting
		// for the same question is how a team reaches a majority, so a repeat
		// vote is not an error.
		socket.on('game:ban', (request: Ban, ack?: (_response: BanResponse) => void) => {
			const reply = typeof ack === 'function' ? ack : () => undefined;
			// Once the window has closed the bans are already decided, reveal
			// or not, so the vote is too late.
			if (game.phase !== 'banning' || game.banRevealEndsAt !== null) return reply({ error: 'not-banning' });
			const problem = game.problemPool.find((entry) => entry.questionId === request?.questionId);
			if (!problem) return reply({ error: 'unknown-problem' });
			if (game.voteLocked.has(user.id)) return reply({ error: 'vote-locked' });

			game.banVotes.set(user.id, problem.questionId);
			reply({ ok: true });
			broadcastState(game);
		});

		// Each player picks one of the problems the bans left, from their own
		// team's pool of choices (US-6-T-10). Play starts once every player
		// still in the game has picked (or the pick window runs out).
		socket.on('game:pick', (request: PickRequest, ack?: (_response: PickResponse) => void) => {
			const reply = typeof ack === 'function' ? ack : () => undefined;
			if (game.phase !== 'picking') return reply({ error: 'not-picking' });
			const problem = game.problemPool.find((entry) => entry.questionId === request?.questionId);
			if (!problem) return reply({ error: 'unknown-problem' });
			if (game.picks.has(user.id)) return reply({ error: 'already-picked' });
			const pickedByTeammate = teamOf(game, player.team)
				.some((teammate) => game.picks.get(teammate.userId) === problem.questionId);
			if (pickedByTeammate) return reply({ error: 'problem-picked' });

			game.picks.set(user.id, problem.questionId);
			reply({ ok: true });
			if (everyonePicked(game)) {
				void finishPicking(game);
				return;
			}
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
