import { createServer } from 'node:http';
import { Server } from 'socket.io';
import type { Socket } from 'socket.io';
import { authenticateToken } from './auth';
import { LobbyError, LobbyState } from './lobby-state';
import type { LobbyStore } from './lobby-state';
import type { TeamId } from './lobby-state';

const LOBBY_ROOM = 'lobby:main';

interface UserData {
	id: string;
	email: string;
	displayName: string;
}

interface ServerOptions {
	disconnectGraceMs?: number;
	origins?: string[];
	store?: LobbyStore;
}

export function createLobbyService(options: ServerOptions = {}) {
	const origins = options.origins ?? (process.env.FRONTEND_URL ?? 'http://localhost:3000')
		.split(',')
		.map((origin) => origin.trim())
		.filter(Boolean);
	const httpServer = createServer((request, response) => {
		if (request.url === '/health') {
			response.writeHead(200, { 'Content-Type': 'application/json' });
			response.end(JSON.stringify({ service: 'lobby-service', status: 'ok' }));
			return;
		}
		response.writeHead(404);
		response.end();
	});
	const io = new Server(httpServer, { cors: { origin: origins, methods: ['GET', 'POST'] } });
	const socketsByUserId = new Map<string, Socket>();
	const lobby = new LobbyState(options.disconnectGraceMs, () => {
		io.to(LOBBY_ROOM).emit('lobby:state', lobby.snapshot());
	}, options.store);
	const ready = lobby.initialize();

	io.use(async (socket, next) => {
		try {
			const user = await authenticateToken(socket.handshake.auth?.token);
			const requestedName = socket.handshake.auth?.displayName;
			const displayName = typeof requestedName === 'string' && requestedName.trim().length > 0
				? requestedName.trim().slice(0, 24)
				: user.email.split('@')[0].slice(0, 24);
			socket.data.user = { ...user, displayName } satisfies UserData;
			next();
		} catch {
			next(new Error('unauthorized'));
		}
	});

	io.on('connection', async (socket) => {
		await ready;
		const user = socket.data.user as UserData;
		const previousSocket = socketsByUserId.get(user.id);
		socketsByUserId.set(user.id, socket);
		if (previousSocket && previousSocket.id !== socket.id) previousSocket.disconnect(true);

		await lobby.connect(user.id);
		await socket.join(LOBBY_ROOM);
		socket.emit('lobby:state', lobby.snapshot());

		socket.on('lobby:join', async () => {
			try {
				await lobby.join(user.id, user.displayName);
			} catch (error) {
				emitError(socket, error);
			}
		});

		socket.on('lobby:leave', async () => {
			try {
				await lobby.leave(user.id);
			} catch (error) {
				emitError(socket, error);
			}
		});

		socket.on('lobby:set-name', async (value: unknown) => {
			try {
				if (typeof value !== 'string' || value.trim().length < 1 || value.trim().length > 24) {
					throw new LobbyError('invalid-name', 'Choose a name between 1 and 24 characters.');
				}
				await lobby.setName(user.id, value.trim());
			} catch (error) {
				emitError(socket, error);
			}
		});

		socket.on('lobby:join-team', async (value: unknown) => {
			try {
				if (value !== 'a' && value !== 'b') {
					throw new LobbyError('invalid-team', 'Choose Team 1 or Team 2.');
				}
				await lobby.joinTeam(user.id, value as TeamId);
			} catch (error) {
				emitError(socket, error);
			}
		});

		socket.on('lobby:request-match', () => {
			try {
				const readiness = lobby.requestMatch(user.id);
				io.to(LOBBY_ROOM).emit('lobby:ready-for-match', readiness);
			} catch (error) {
				emitError(socket, error);
			}
		});

		socket.on('disconnect', () => {
			if (socketsByUserId.get(user.id)?.id !== socket.id) return;
			socketsByUserId.delete(user.id);
			void lobby.disconnect(user.id).catch((error: unknown) => {
				console.error('[lobby-service] could not update disconnected player', error);
			});
		});
	});

	return {
		httpServer,
		io,
		lobby,
		ready,
		close: () => new Promise<void>((resolve) => {
			lobby.stop();
			io.close(() => resolve());
		}),
	};
}

function emitError(socket: Socket, error: unknown): void {
	if (error instanceof LobbyError) {
		socket.emit('lobby:error', { code: error.code, message: error.message });
		return;
	}
	console.error('[lobby-service] unexpected socket error', error);
	socket.emit('lobby:error', { code: 'internal-error', message: 'The lobby could not process that request.' });
}
