// US-6-T-2: Game socket context should connect with the player's identity
//  - The socket should be opened with the login token and the gameId in its auth payload
//  - A "game:state" event from the server should be exposed to the page
//  - When the server rejects the connection with "not-in-game", a "not a player in this match" error should be exposed
// Game socket context should handle the end of the game
//  - A "game:ended" event from the server should expose the result to the page
//  - Forfeiting should send a "game:forfeit" event to the server
// Game socket context should send bans
//  - Banning should send a "game:ban" event with the questionId to the server
// US-6-T-6: Game socket context
//  - Submitting should emit "game:submit" with the question id and code and resolve with the grading
//  - A refused submission should reject with a readable message
//  - Sharing code should emit "game:code" with the question id and workspace
// US-6-T-7: Game socket context should expose teammates' code
//  - A received "game:code" event should be stored under the sending teammate's userId and questionId
//  - On connecting, a "game:code:snapshot" of teammates' saved workspaces should be loaded into state
//  - A later "game:code" event for the same teammate and question should replace, not merge with, the earlier one
// US-3-T-3: Game socket context should store the team's chat history
//  - A received "chat:history" should be exposed to the page as chatHistory
import { useEffect, useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { fakeUser } from './helpers';

// socket.io-client is replaced with a fake that records the connection
// options and lets a test fire server events by hand, so nothing here opens
// a real network connection.
const socketMocks = vi.hoisted(() => ({
	io: vi.fn(),
}));

vi.mock('socket.io-client', () => ({ io: (...args: unknown[]) => socketMocks.io(...args) }));
vi.mock('../app/login/context', () => ({ useAuth: () => ({ user: fakeUser, isLoading: false }) }));

import { GameSocketProvider, useGameSocket } from '../app/game/socket-context';

type Handler = (_payload: unknown) => void;

// A stand-in for a socket.io-client Socket: `on` records handlers and `fire`
// invokes them the way the real socket would on a server event.
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
		// socket.timeout(ms).emitWithAck(...) — what the server answers is set per test.
		emitWithAck: vi.fn(),
		timeout: vi.fn(() => socket),
	};
	const fire = (event: string, payload?: unknown) => {
		for (const handler of handlers.get(event) ?? []) handler(payload);
	};
	return { socket, fire };
}

// One editor for one question, as the practice editor keeps it.
const WORKSPACE = { tabs: [{ id: 'tab-1', name: 'Tab 1', code: 'print(1)' }], activeTabId: 'tab-1' };

// A minimal page: joins game-1 on mount and prints what the context exposes.
function Consumer() {
	const { connect, game, error, result, forfeit, ban, submit, shareCode, teammateCode, chatHistory } = useGameSocket();
	const [submitted, setSubmitted] = useState('');
	useEffect(() => {
		connect('game-1');
	}, [connect]);
	return (
		<div>
			<span data-testid="game-id">{game?.gameId ?? ''}</span>
			<span data-testid="error">{error?.message ?? ''}</span>
			<span data-testid="winner">{result?.winner ?? ''}</span>
			<button onClick={forfeit}>Forfeit</button>
			{/* Bans the problem with questionId 7. */}
			<button onClick={() => ban(7)}>Ban</button>
			{/* Submits code for question 3 and prints the verdict, or the refusal message. */}
			<button onClick={() => submit(3, 'print(1)').then((grading) => setSubmitted(grading.verdict), (err: Error) => setSubmitted(err.message))}>Submit</button>
			<span data-testid="submitted">{submitted}</span>
			<button onClick={() => shareCode(3, WORKSPACE)}>Share</button>
			<span data-testid="teammate-code">{JSON.stringify(teammateCode)}</span>
			<span data-testid="chat-history">{JSON.stringify(chatHistory)}</span>
		</div>
	);
}

function renderConsumer() {
	return render(
		<GameSocketProvider>
			<Consumer />
		</GameSocketProvider>,
	);
}

let fake: ReturnType<typeof fakeSocket>;

beforeEach(() => {
	vi.clearAllMocks();
	fake = fakeSocket();
	socketMocks.io.mockReturnValue(fake.socket);
	// getToken() reads the cached session token from localStorage.
	localStorage.setItem('authToken', 'token-1');
});

afterEach(() => {
	cleanup();
	localStorage.clear();
});

describe('game socket context', () => {
	it('US-6-T-2 opens the socket with the login token and gameId in its auth payload', () => {
		renderConsumer();

		const [, options] = socketMocks.io.mock.calls[0] as [string, { auth: Record<string, unknown> }];
		expect(options.auth).toEqual({ token: 'token-1', gameId: 'game-1' });
	});

	it('US-6-T-2 exposes the game state the server sends', () => {
		renderConsumer();

		act(() => fake.fire('game:state', { gameId: 'game-1', players: [], problemPool: [], scores: { a: 0, b: 0 }, secondsRemaining: 1200, startedAt: 0 }));

		expect(screen.getByTestId('game-id').textContent).toBe('game-1');
	});

	it('US-6-T-2 reports a readable error when the server says the user is not in the game', () => {
		renderConsumer();

		act(() => fake.fire('connect_error', new Error('not-in-game')));

		expect(screen.getByTestId('error').textContent).toBe('You are not a player in this match.');
	});

	it('US-6-T-2 exposes the result the server sends when the game ends', () => {
		renderConsumer();

		act(() => fake.fire('game:ended', { winner: 'b', reason: 'forfeit' }));

		expect(screen.getByTestId('winner').textContent).toBe('b');
	});

	it('US-6-T-2 sends game:forfeit to the server when forfeiting', () => {
		renderConsumer();

		act(() => screen.getByRole('button', { name: 'Forfeit' }).click());

		expect(fake.socket.emit).toHaveBeenCalledWith('game:forfeit');
	});

	it('sends game:ban with the questionId to the server when banning', () => {
		renderConsumer();

		act(() => screen.getByRole('button', { name: 'Ban' }).click());

		expect(fake.socket.emit).toHaveBeenCalledWith('game:ban', { questionId: 7 });
	});

	it('US-6-T-6 emits game:submit with the question id and code when submitting', () => {
		fake.socket.emitWithAck.mockResolvedValue({ verdict: 'Accepted', passed: 3, total: 3 });
		renderConsumer();

		act(() => screen.getByRole('button', { name: 'Submit' }).click());

		expect(fake.socket.emitWithAck).toHaveBeenCalledWith('game:submit', { questionId: 3, code: 'print(1)' });
	});

	it('US-6-T-6 resolves a submission with the game\'s grading', async () => {
		fake.socket.emitWithAck.mockResolvedValue({ verdict: 'Accepted', passed: 3, total: 3 });
		renderConsumer();

		act(() => screen.getByRole('button', { name: 'Submit' }).click());

		expect(await screen.findByText('Accepted')).toBeTruthy();
	});

	it('US-6-T-6 rejects a refused submission with a readable message', async () => {
		fake.socket.emitWithAck.mockResolvedValue({ error: 'cooldown' });
		renderConsumer();

		act(() => screen.getByRole('button', { name: 'Submit' }).click());

		expect(await screen.findByText('Your team just submitted. Wait a few seconds before submitting again.')).toBeTruthy();
	});

	it('US-6-T-6 emits game:code with the question id and workspace when sharing code', () => {
		renderConsumer();

		act(() => screen.getByRole('button', { name: 'Share' }).click());

		expect(fake.socket.emit).toHaveBeenCalledWith('game:code', { questionId: 3, workspace: WORKSPACE });
	});

	it('US-6-T-7 stores a received game:code event under the sending teammate\'s userId and questionId', () => {
		renderConsumer();

		act(() => fake.fire('game:code', { userId: 'u2', displayName: 'Alan', questionId: 5, workspace: WORKSPACE }));

		expect(JSON.parse(screen.getByTestId('teammate-code').textContent ?? '{}')).toEqual({ u2: { 5: WORKSPACE } });
	});

	it('US-6-T-7 loads a received game:code:snapshot into teammateCode', () => {
		renderConsumer();

		act(() => fake.fire('game:code:snapshot', [{ userId: 'u2', displayName: 'Alan', questionId: 5, workspace: WORKSPACE }]));

		expect(JSON.parse(screen.getByTestId('teammate-code').textContent ?? '{}')).toEqual({ u2: { 5: WORKSPACE } });
	});

	it('US-6-T-7 replaces, rather than merges with, an earlier game:code for the same teammate and question', () => {
		const laterWorkspace = { tabs: [{ id: 'tab-1', name: 'Tab 1', code: 'print(2)' }], activeTabId: 'tab-1' };
		renderConsumer();
		act(() => fake.fire('game:code', { userId: 'u2', displayName: 'Alan', questionId: 5, workspace: WORKSPACE }));

		act(() => fake.fire('game:code', { userId: 'u2', displayName: 'Alan', questionId: 5, workspace: laterWorkspace }));

		expect(JSON.parse(screen.getByTestId('teammate-code').textContent ?? '{}')).toEqual({ u2: { 5: laterWorkspace } });
	});
});

describe('game socket context chat history', () => {
	it('US-3-T-3 exposes a received chat:history to the page as chatHistory', () => {
		const history = [
			{ id: 'm1', userId: 'u2', displayName: 'Grace', team: 'a', text: 'first', sentAt: '2026-11-17T12:00:00.000Z' },
			{ id: 'm2', userId: 'u3', displayName: 'Katherine', team: 'a', text: 'second', sentAt: '2026-11-17T12:00:05.000Z' },
		];
		renderConsumer();

		act(() => fake.fire('chat:history', history));

		expect(JSON.parse(screen.getByTestId('chat-history').textContent ?? '[]')).toEqual(history);
	});
});
