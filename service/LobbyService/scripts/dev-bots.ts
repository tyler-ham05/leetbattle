// Dev-only helper: fills out the shared lobby with bot players through the
// real lobby socket. Log into the frontend and join the lobby as yourself
// FIRST, then run this -- it fills whatever seats are left with bots and
// readies everyone up, so you land straight in a real match to manually
// exercise banning and picking in the real game UI without rounding up real
// teammates first.
//
// Run from service/LobbyService (needs LobbyService + GameService + the dev
// Postgres up):
//   npx ts-node scripts/dev-bots.ts [--team-size 1|2|3]
//
// Defaults to a 3v3 (team size 3): with you already in the lobby, that's 5
// bots. Pass --team-size to change it. A --team-size of 1 skips banning and
// picking entirely (US-6-T-10), so use 2 or 3 to test those. Run it with no
// one in the lobby yet and it fills every seat itself, for a bots-only match.
//
// Bots join a team as soon as they connect, but only ready up once the lobby
// is actually full (the server refuses "ready" before then), so they never
// block on your own seat. Once the match starts, each bot reconnects to
// GameService and bans the first unbanned problem, then picks one problem
// for itself -- never more, so the phase can finish without everyone being
// a human, while leaving you free to pick as many as your own limit
// (US-8-2) allows.
import * as path from 'node:path';
import { randomUUID } from 'node:crypto';
import dotenv from 'dotenv';
import { EncryptJWT } from 'jose';
import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';

dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });

const LOBBY_URL = process.env.LOBBY_SERVICE_URL ?? 'http://localhost:4003';
const GAME_URL = process.env.GAME_SERVICE_URL ?? 'http://localhost:4004';
const STATE_TIMEOUT_MS = 10_000;

interface Args {
	teamSize: number;
}

function parseArgs(): Args {
	const args = process.argv.slice(2);
	const i = args.indexOf('--team-size');
	const teamSize = Math.min(3, Math.max(1, Number(i === -1 ? 3 : args[i + 1]) || 3));
	return { teamSize };
}

// Mints a session token the same way AuthService does, so Lobby/GameService
// (which only check the shared SECRET, not the AuthService database) accept
// it with no real account required.
async function tokenFor(id: string): Promise<string> {
	const secret = process.env.SECRET;
	if (!secret) throw new Error('SECRET is not set in the root .env');
	return new EncryptJWT({ id, email: `${id}@example.test` })
		.setProtectedHeader({ alg: 'dir', enc: 'A256CBC-HS512' })
		.setIssuedAt()
		.setExpirationTime('2h')
		.encrypt(new TextEncoder().encode(secret));
}

type TeamId = 'a' | 'b';

interface LobbyPlayer {
	userId: string;
	team: TeamId | null;
}

interface LobbySnapshot {
	players: LobbyPlayer[];
	playerCount: number;
	canReady: boolean;
	teamSize: number;
	hostId: string | null;
}

// Resolves with the next `lobby:state` a socket receives.
function nextLobbyState(socket: Socket): Promise<LobbySnapshot> {
	return new Promise((resolve, reject) => {
		const timeout = setTimeout(() => reject(new Error('Timed out waiting for lobby:state')), STATE_TIMEOUT_MS);
		socket.once('lobby:state', (state: LobbySnapshot) => {
			clearTimeout(timeout);
			resolve(state);
		});
	});
}

interface Bot {
	userId: string;
	token: string;
	displayName: string;
	socket: Socket;
}

// Connects one bot, joins the lobby, becomes host and sets the team size if
// it happens to be the first one in, then joins whichever team still has
// room. The ready-up and game-started watchers are armed first, before any
// of that, so they never miss a `canReady` transition that lands while this
// very call (or a later bot's, or the human's) is still in flight.
async function addBot(displayName: string, teamSize: number): Promise<Bot> {
	const userId = randomUUID();
	const token = await tokenFor(userId);
	const socket = io(LOBBY_URL, { auth: { token, displayName } });
	socket.on('lobby:error', (error: { code: string; message: string }) => console.error(`[${displayName}] lobby:error:`, error.message));
	const bot: Bot = { userId, token, displayName, socket };
	armReadyWatcher(bot);

	await nextLobbyState(socket); // the state sent right on connect
	const joined = nextLobbyState(socket);
	socket.emit('lobby:join');
	let state = await joined;

	if (state.hostId === userId && state.teamSize !== teamSize) {
		const resized = nextLobbyState(socket);
		socket.emit('lobby:set-team-size', teamSize);
		state = await resized;
	}

	const teamACount = state.players.filter((player) => player.team === 'a').length;
	const team: TeamId = teamACount < state.teamSize ? 'a' : 'b';
	const onTeam = nextLobbyState(socket);
	socket.emit('lobby:join-team', team);
	await onTeam;

	console.log(`[${displayName}] joined team ${team === 'a' ? '1' : '2'}.`);
	return bot;
}

// Readies the bot up the moment the lobby actually has every seat filled
// (readying any earlier is refused -- the server requires both teams full
// first), then starts a GameService bot once the match it triggers begins.
// Armed as soon as the bot connects (see `addBot`) so a `canReady: true`
// state fired by someone else's join -- including the human's -- is never
// missed while this bot is still busy joining a team.
function armReadyWatcher(bot: Bot): void {
	let readied = false;
	bot.socket.on('lobby:state', (state: LobbySnapshot) => {
		if (readied || !state.canReady) return;
		readied = true;
		bot.socket.emit('lobby:set-ready', true);
		console.log(`[${bot.displayName}] ready.`);
	});
	bot.socket.on('lobby:game-started', ({ gameId }: { gameId: string }) => {
		console.log(`[${bot.displayName}] match started: ${gameId}`);
		runMatchBot(bot.displayName, gameId, bot.token);
	});
}

interface PoolProblem {
	questionId: number;
	bannedBy: { userId: string } | null;
	pickedBy: Record<TeamId, { userId: string } | null>;
}

interface GameStatePayload {
	phase: 'waiting' | 'banning' | 'picking' | 'playing' | 'ended';
	problemPool: PoolProblem[];
}

// Connects one bot to its live match: bans the first unbanned problem once
// banning starts, then (once picking starts) picks the first problem no one
// on either team has claimed yet -- just one, the same "do the minimum"
// behaviour as the ban, so a human teammate still has the rest of the pool
// free to pick from.
//
// Two teammates can both react to the same broadcast and target the same
// problem; the loser's ban/pick is refused server-side. Retrying on failure
// isn't enough by itself: if a second broadcast (from whichever teammate won
// the race) lands while this bot's own refused attempt is still in flight,
// it's ignored (an attempt is already in progress) and never re-checked, so
// the bot can stall forever with nothing left to wake it. Re-driving the
// attempt from `lastState` after every attempt settles, not just reacting to
// the next `game:state`, closes that gap -- without it, most bots in a match
// never actually got to ban or pick anything, leaning entirely on
// GameService's window-timeout auto-assign instead of exercising the feature.
function runMatchBot(displayName: string, gameId: string, token: string): void {
	const socket = io(GAME_URL, { autoConnect: false, auth: { token, gameId } });
	let lastState: GameStatePayload | null = null;
	let attempting = false;
	let banned = false;
	let picked = false;

	const attempt = (): void => {
		if (attempting || !lastState) return;
		if (lastState.phase === 'banning' && !banned) {
			const target = lastState.problemPool.find((problem) => !problem.bannedBy);
			if (!target) return;
			attempting = true;
			socket.timeout(2_000).emitWithAck('game:ban', { questionId: target.questionId })
				.then((response: { ok?: boolean }) => { if (response?.ok) banned = true; })
				.catch(() => undefined)
				.finally(() => { attempting = false; attempt(); });
			return;
		}
		if (lastState.phase === 'picking' && !picked) {
			const target = lastState.problemPool.find((problem) => !problem.pickedBy.a && !problem.pickedBy.b);
			if (!target) return;
			attempting = true;
			socket.timeout(2_000).emitWithAck('game:pick', { questionId: target.questionId })
				.then((response: { ok?: boolean }) => { if (response?.ok) picked = true; })
				.catch(() => undefined)
				.finally(() => { attempting = false; attempt(); });
		}
	};

	socket.on('game:state', (state: GameStatePayload) => {
		lastState = state;
		attempt();
	});
	socket.on('connect_error', (err: Error) => console.error(`[${displayName}] connect_error:`, err.message));
	socket.connect();
}

async function main() {
	const { teamSize } = parseArgs();

	// Peeks at the lobby's current size before deciding how many bots to add,
	// so whoever already joined (you, or an earlier run of this script) is
	// accounted for rather than double-counted.
	const scout = io(LOBBY_URL, { auth: { token: await tokenFor(randomUUID()) } });
	const initial = await nextLobbyState(scout);
	scout.disconnect();

	const capacity = (initial.playerCount > 0 ? initial.teamSize : teamSize) * 2;
	const seatsToFill = Math.max(0, capacity - initial.playerCount);
	if (seatsToFill === 0) {
		console.log(`The lobby already has ${initial.playerCount} of ${capacity} seats filled; nothing to add.`);
		return;
	}

	console.log(`Adding ${seatsToFill} bot${seatsToFill === 1 ? '' : 's'} to the lobby...`);
	const bots: Bot[] = [];
	for (let i = 0; i < seatsToFill; i++) bots.push(await addBot(`Bot ${i + 1}`, teamSize));

	console.log('The lobby is full; the match will start once everyone is ready.');
	console.log('Press Ctrl+C to stop the bots.');

	process.on('SIGINT', () => {
		for (const bot of bots) bot.socket.disconnect();
		process.exit(0);
	});
}

main().catch((err) => {
	console.error(err instanceof Error ? err.message : err);
	process.exit(1);
});
