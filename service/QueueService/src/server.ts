import { createServer } from 'node:http';
import { Server } from 'socket.io';
import type { Socket } from 'socket.io';
import { authenticateToken } from './auth';

export type QueueMode = '1v1' | '2v2' | '3v3';

// Players per team in each queue.
const TEAM_SIZE: Record<QueueMode, number> = { '1v1': 1, '2v2': 2, '3v3': 3 };
const MODES = Object.keys(TEAM_SIZE) as QueueMode[];
// How long to wait for GameService to create the match before giving up.
const GAME_START_TIMEOUT_MS = 5_000;

interface QueuedPlayer {
	userId: string;
	displayName: string;
}

interface ServiceOptions {
	origins?: string[];
	gameServiceUrl?: string;
}

const isQueueMode = (value: unknown): value is QueueMode => typeof value === 'string' && value in TEAM_SIZE;

export function createQueueService(options: ServiceOptions = {}) {
	const origins = options.origins ?? (process.env.FRONTEND_URL ?? 'http://localhost:3000')
		.split(',')
		.map((origin) => origin.trim())
		.filter(Boolean);
	const gameServiceUrl = options.gameServiceUrl ?? process.env.GAME_SERVICE_URL ?? 'http://localhost:4004';

	const httpServer = createServer((request, response) => {
		if (request.url === '/health') {
			response.writeHead(200, { 'Content-Type': 'application/json' });
			response.end(JSON.stringify({ service: 'queue-service', status: 'ok' }));
			return;
		}
		response.writeHead(404);
		response.end();
	});
	const io = new Server(httpServer, { cors: { origin: origins, methods: ['GET', 'POST'] } });

	const queues: Record<QueueMode, QueuedPlayer[]> = { '1v1': [], '2v2': [], '3v3': [] };
	// The queue each waiting player is in. A player is in at most one queue.
	const queueOf = new Map<string, QueueMode>();
	// Players whose match GameService is creating right now, and the queue they
	// came from. If the request fails, the ones still here go back to that queue.
	const matching = new Map<string, QueueMode>();
	const socketsByUserId = new Map<string, Socket>();
	// One lock per queue: match attempts for a queue run one after another, so
	// two attempts can never take the same players. Queues don't wait on each other.
	const locks: Record<QueueMode, Promise<void>> = { '1v1': Promise.resolve(), '2v2': Promise.resolve(), '3v3': Promise.resolve() };
	const withLock = (mode: QueueMode, task: () => void) => {
		locks[mode] = locks[mode].then(task).catch((error: unknown) => {
			console.error('[queue-service] match attempt failed', error);
		});
	};

	const counts = () => Object.fromEntries(MODES.map((mode) => [mode, queues[mode].length])) as Record<QueueMode, number>;
	const emitState = () => {
		const current = counts();
		for (const [userId, socket] of socketsByUserId) {
			socket.emit('queue:state', { queue: queueOf.get(userId) ?? null, counts: current });
		}
	};

	// Takes a player out of whichever queue they're waiting in, and out of any
	// match being created, so they can't be put back if that match fails.
	const removePlayer = (userId: string) => {
		const mode = queueOf.get(userId);
		if (mode) queues[mode] = queues[mode].filter((player) => player.userId !== userId);
		queueOf.delete(userId);
		matching.delete(userId);
	};

	const startGame = async (mode: QueueMode, players: QueuedPlayer[]) => {
		const teamSize = TEAM_SIZE[mode];
		try {
			const response = await fetch(`${gameServiceUrl}/game`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					players: players.map((player, index) => ({ ...player, team: index < teamSize ? 'a' : 'b' })),
				}),
				signal: AbortSignal.timeout(GAME_START_TIMEOUT_MS),
			});
			if (!response.ok) throw new Error(`GameService responded with status ${response.status}`);
			const { gameId } = await response.json() as { gameId: string };
			for (const { userId } of players) {
				matching.delete(userId);
				socketsByUserId.get(userId)?.emit('queue:matched', { gameId });
			}
		} catch (error) {
			console.error('[queue-service] could not start the game', error);
			// Back to the front of the queue, in their original order. The next
			// join retries the match, so a GameService outage can't loop forever.
			const stillWaiting = players.filter(({ userId }) => matching.get(userId) === mode);
			for (const { userId } of stillWaiting) {
				matching.delete(userId);
				queueOf.set(userId, mode);
			}
			queues[mode] = [...stillWaiting, ...queues[mode]];
			emitState();
			for (const { userId } of stillWaiting) {
				socketsByUserId.get(userId)?.emit('queue:error', {
					code: 'game-start-failed',
					message: 'The match could not be started. You are still in the queue.',
				});
			}
		}
	};

	// Takes every full match out of the queue and asks GameService for each one.
	// The GameService calls run in parallel; only taking the players is locked.
	const matchQueue = (mode: QueueMode) => withLock(mode, () => {
		const matchSize = TEAM_SIZE[mode] * 2;
		let took = false;
		while (queues[mode].length >= matchSize) {
			const players = queues[mode].splice(0, matchSize);
			for (const { userId } of players) {
				queueOf.delete(userId);
				matching.set(userId, mode);
			}
			took = true;
			void startGame(mode, players);
		}
		if (took) emitState();
	});

	io.use(async (socket, next) => {
		try {
			const user = await authenticateToken(socket.handshake.auth?.token);
			const requestedName = socket.handshake.auth?.displayName;
			const displayName = typeof requestedName === 'string' && requestedName.trim().length > 0
				? requestedName.trim().slice(0, 24)
				: user.email.split('@')[0].slice(0, 24);
			socket.data.user = { userId: user.id, displayName } satisfies QueuedPlayer;
			next();
		} catch {
			next(new Error('unauthorized'));
		}
	});

	io.on('connection', (socket) => {
		const user = socket.data.user as QueuedPlayer;
		const previousSocket = socketsByUserId.get(user.userId);
		socketsByUserId.set(user.userId, socket);
		if (previousSocket && previousSocket.id !== socket.id) previousSocket.disconnect(true);
		socket.emit('queue:state', { queue: queueOf.get(user.userId) ?? null, counts: counts() });

		// Joining a different queue moves the player; joining their own queue keeps their place.
		socket.on('queue:join', (mode: unknown) => {
			if (!isQueueMode(mode)) {
				socket.emit('queue:error', { code: 'invalid-queue', message: 'Choose the 1v1, 2v2 or 3v3 queue.' });
				return;
			}
			if (queueOf.get(user.userId) !== mode) {
				removePlayer(user.userId);
				queues[mode].push(user);
				queueOf.set(user.userId, mode);
			}
			emitState();
			matchQueue(mode);
		});

		socket.on('queue:leave', () => {
			removePlayer(user.userId);
			emitState();
		});

		socket.on('disconnect', () => {
			if (socketsByUserId.get(user.userId)?.id !== socket.id) return;
			socketsByUserId.delete(user.userId);
			removePlayer(user.userId);
			emitState();
		});
	});

	return {
		httpServer,
		io,
		close: () => new Promise<void>((resolve) => {
			io.close(() => resolve());
		}),
	};
}
