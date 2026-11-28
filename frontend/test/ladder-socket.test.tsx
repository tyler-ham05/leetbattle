// US-7-T-2: Ladder matchmaking queues: queue socket context (app/ladder/socket-context.tsx)
// Acceptance criteria covered:
//   - queue:matched hands the page the new gameId
//   - The socket connects to QueueService (port 4005), never LobbyService
//   - queue:error hands the page the error to show
// Also:
//   - the login token is sent in the socket handshake
//   - queue:state exposes which queue the player is waiting in
// socket.io-client is replaced with a fake, so no real connection is opened.
import { useEffect } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { fakeUser } from './helpers';

const socketMocks = vi.hoisted(() => ({
	io: vi.fn(),
}));

vi.mock('socket.io-client', () => ({ io: (...args: unknown[]) => socketMocks.io(...args) }));
vi.mock('../app/login/context', () => ({ useAuth: () => ({ user: fakeUser, isLoading: false }) }));

import { QueueSocketProvider, useQueueSocket } from '../app/ladder/socket-context';

type Handler = (_payload: unknown) => void;

// `fire` triggers a server event.
function fakeSocket() {
	const handlers = new Map<string, Handler[]>();
	const socket = {
		connected: false,
		on: vi.fn((event: string, handler: Handler) => {
			handlers.set(event, [...(handlers.get(event) ?? []), handler]);
			return socket;
		}),
		connect: vi.fn(),
		disconnect: vi.fn(),
		emit: vi.fn(),
	};
	const fire = (event: string, payload?: unknown) => {
		for (const handler of handlers.get(event) ?? []) handler(payload);
	};
	return { socket, fire };
}

function Consumer() {
	const { connect, queue, matched, error } = useQueueSocket();
	useEffect(() => {
		connect();
	}, [connect]);
	return (
		<>
			<span data-testid="queue">{queue?.queue ?? ''}</span>
			<span data-testid="game-id">{matched?.gameId ?? ''}</span>
			<span data-testid="rivals">{matched?.rivals?.join(',') ?? ''}</span>
			<span data-testid="error">{error?.code ?? ''}</span>
		</>
	);
}

function renderConsumer() {
	return render(
		<QueueSocketProvider>
			<Consumer />
		</QueueSocketProvider>,
	);
}

let sockets: ReturnType<typeof fakeSocket>[];

beforeEach(() => {
	vi.clearAllMocks();
	sockets = [];
	socketMocks.io.mockImplementation(() => {
		const fake = fakeSocket();
		sockets.push(fake);
		return fake.socket;
	});
	localStorage.setItem('authToken', 'token-1');
});

afterEach(() => {
	cleanup();
	localStorage.clear();
});

describe('US-7-T-2 connecting to QueueService (criterion 10)', () => {
	it('US-7-T-2 connects to QueueService on port 4005 by default', () => {
		renderConsumer();

		expect(socketMocks.io.mock.calls[0][0]).toBe('http://localhost:4005');
	});

	it('US-7-T-2 never connects to LobbyService', () => {
		renderConsumer();

		expect(socketMocks.io.mock.calls.some(([url]) => String(url).includes(':4003'))).toBe(false);
	});

	it('US-7-T-2 sends the login token in the socket handshake', () => {
		renderConsumer();

		expect(socketMocks.io.mock.calls[0][1].auth.token).toBe('token-1');
	});

	it('US-7-T-2 opens the connection once when connect is called', () => {
		renderConsumer();

		expect(sockets[0].socket.connect).toHaveBeenCalledTimes(1);
	});
});

describe('US-7-T-2 server events', () => {
	it('US-7-T-2 exposes the queue the player is waiting in from queue:state', () => {
		renderConsumer();
		act(() => sockets[0].fire('queue:state', { queue: '2v2', counts: { '1v1': 0, '2v2': 1, '3v3': 0 } }));

		expect(screen.getByTestId('queue').textContent).toBe('2v2');
	});

	it('US-7-T-2 exposes the new gameId from queue:matched (criterion 3)', () => {
		renderConsumer();
		act(() => sockets[0].fire('queue:matched', { gameId: 'game-1' }));

		expect(screen.getByTestId('game-id').textContent).toBe('game-1');
	});

	it('US-10-T-10 exposes the team names from queue:matched', () => {
		renderConsumer();
		// The names are optional extras on queue:matched; the page needs them for the team columns.
		act(() => sockets[0].fire('queue:matched', { gameId: 'game-1', yourTeam: ['Ada', 'Linus'], rivals: ['Ken', 'Barbara'] }));

		expect(screen.getByTestId('rivals').textContent).toBe('Ken,Barbara');
	});

	it('US-7-T-2 exposes the error from queue:error (criterion 11)', () => {
		renderConsumer();
		act(() => sockets[0].fire('queue:error', { code: 'game-start-failed', message: 'The match could not be started.' }));

		expect(screen.getByTestId('error').textContent).toBe('game-start-failed');
	});
});
