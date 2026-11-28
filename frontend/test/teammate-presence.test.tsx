// US-6-T-13: Teammate presence in the workspace switcher
// The game socket remembers which question each teammate last edited
//  - Before any teammate edits anything, no teammate should have a question
//  - After a teammate's game:code for question 2, that teammate's question should be 2
//  - After a teammate's game:code for question 2 and then for question 3, that teammate's question should be 3
//  - A game:code from one teammate should not change another teammate's question
//  - A game:code:snapshot should give each teammate the question of their latest entry in it
//  - Connecting to a new match should forget every teammate's question
// The workspace switcher shows each teammate's question
//  - A teammate who last edited question 2 (the second in the pool) should show "Q2" after their name
//  - The "Q2" should be in muted text (text-muted)
//  - A teammate who has not edited anything should show only their name
//  - The number should be the question's position in the pool, not its question id
//  - The "You" tab should never show a question
//  - A disconnected teammate who edited question 2 should still show the disconnected icon
//  - A disconnected teammate's tab should still be faded
// Opening a teammate's workspace opens it on their question
//  - On the game page, a teammate who edited question 1 and then question 2 should show "Q2" on their tab
//  - On the game page, a teammate who has not edited anything should show no question on their tab
//  - On the game page, opening the teammate who edited question 1 and then question 2 should show question 2
// (socket.io-client and CodeService's fetch are faked; no test touches a backend service)
import { useEffect } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fakeUser, jsonResponse, makeProblem, stubFetch } from './helpers';

// socket.io-client is replaced with a fake whose handlers a test fires by
// hand, so neither the socket context nor the game page reaches GameService.
const socketMocks = vi.hoisted(() => ({ io: vi.fn() }));

vi.mock('socket.io-client', () => ({ io: (...args: unknown[]) => socketMocks.io(...args) }));
vi.mock('../app/login/context', () => ({ useAuth: () => ({ user: fakeUser, isLoading: false }) }));
vi.mock('next/navigation', () => ({
	useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
	// The game page under test is always /game/game-1.
	useParams: () => ({ gameId: 'game-1' }),
}));
// Monaco needs a real browser; a textarea with the same controlled contract stands in.
vi.mock('@monaco-editor/react', () => ({
	default: ({ value, onChange, options }: { value: string; onChange?: (_v: string) => void; options?: { readOnly?: boolean } }) => (
		<textarea data-testid="monaco" value={value} readOnly={options?.readOnly} onChange={(e) => onChange?.(e.target.value)} />
	),
}));

import { GameSocketProvider, useGameSocket } from '../app/game/socket-context';
import type { GamePlayer } from '../app/game/socket-context';
import WorkspaceSwitcher from '../app/game/components/workspace-switcher';
import GamePage from '../app/game/[gameId]/page';

type Handler = (_payload: unknown) => void;

// A stand-in socket: `on` records handlers and `fire` calls them the way the
// real socket would on a server event.
function fakeSocket() {
	const handlers = new Map<string, Handler[]>();
	const socket = {
		connected: false,
		on: vi.fn((event: string, handler: Handler) => {
			handlers.set(event, [...(handlers.get(event) ?? []), handler]);
			return socket;
		}),
		off: vi.fn(() => socket),
		connect: vi.fn(),
		disconnect: vi.fn(),
		emit: vi.fn(),
	};
	const fire = (event: string, payload?: unknown) => {
		for (const handler of handlers.get(event) ?? []) handler(payload);
	};
	return { socket, fire };
}

// One editor for one question, as GameService relays it.
const WORKSPACE = { tabs: [{ id: 'tab-1', name: 'Tab 1', code: 'print(1)' }], activeTabId: 'tab-1' };

// A game:code entry from one teammate for one question.
function codeEntry(userId: string, questionId: number) {
	return { userId, questionId, workspace: WORKSPACE };
}

// Joins `gameId` on mount (and again when it changes) and prints the
// per-teammate question map the context exposes.
function Consumer({ gameId = 'game-1' }: { gameId?: string }) {
	const { connect, teammateQuestion } = useGameSocket();
	useEffect(() => {
		connect(gameId);
	}, [connect, gameId]);
	return <span data-testid="teammate-question">{JSON.stringify(teammateQuestion)}</span>;
}

// What the consumer last printed, parsed back into an object.
function teammateQuestion() {
	return JSON.parse(screen.getByTestId('teammate-question').textContent || 'null');
}

function player(userId: string, displayName: string, connected = true): GamePlayer {
	return { userId, displayName, team: 'a', connected, left: false };
}

let fake: ReturnType<typeof fakeSocket>;

beforeEach(() => {
	vi.clearAllMocks();
	vi.unstubAllGlobals();
	fake = fakeSocket();
	socketMocks.io.mockReturnValue(fake.socket);
	// getToken() reads the cached session token from localStorage.
	localStorage.setItem('authToken', 'token-1');
	// A fake CodeService: GET /problem/:id serves that problem; nothing else is used.
	stubFetch((url) => jsonResponse(makeProblem(Number(url.split('/').pop()), 'Easy')));
});

afterEach(() => {
	cleanup();
	localStorage.clear();
});

describe('game socket teammate question', () => {
	function renderConsumer() {
		return render(<GameSocketProvider><Consumer /></GameSocketProvider>);
	}

	it('US-6-T-13 gives no teammate a question before anyone edits', () => {
		renderConsumer();

		expect(teammateQuestion()).toEqual({});
	});

	it('US-6-T-13 remembers the question of a teammate\'s game:code', () => {
		renderConsumer();

		act(() => fake.fire('game:code', codeEntry('u2', 2)));

		expect(teammateQuestion()).toEqual({ u2: 2 });
	});

	it('US-6-T-13 keeps only the question of a teammate\'s most recent game:code', () => {
		renderConsumer();
		act(() => fake.fire('game:code', codeEntry('u2', 2)));

		act(() => fake.fire('game:code', codeEntry('u2', 3)));

		expect(teammateQuestion()).toEqual({ u2: 3 });
	});

	it('US-6-T-13 does not change another teammate\'s question on a game:code', () => {
		renderConsumer();
		act(() => fake.fire('game:code', codeEntry('u2', 2)));

		act(() => fake.fire('game:code', codeEntry('u3', 1)));

		expect(teammateQuestion()).toEqual({ u2: 2, u3: 1 });
	});

	it('US-6-T-13 takes each teammate\'s latest entry from a game:code:snapshot', () => {
		renderConsumer();

		act(() => fake.fire('game:code:snapshot', [codeEntry('u2', 1), codeEntry('u3', 3), codeEntry('u2', 2)]));

		expect(teammateQuestion()).toEqual({ u2: 2, u3: 3 });
	});

	it('US-6-T-13 forgets every teammate\'s question when connecting to a new match', () => {
		const { rerender } = renderConsumer();
		act(() => fake.fire('game:code', codeEntry('u2', 2)));
		socketMocks.io.mockReturnValue(fakeSocket().socket);

		rerender(<GameSocketProvider><Consumer gameId="game-2" /></GameSocketProvider>);

		expect(teammateQuestion()).toEqual({});
	});
});

describe('workspace switcher teammate question', () => {
	// The pool in its order: question id 7 is the second question (Q2).
	const POOL = [4, 7, 9];

	function renderSwitcher(teammates: GamePlayer[], teammateQuestion: Record<string, number>) {
		render(<WorkspaceSwitcher teammates={teammates} viewedUserId={null} onSelect={vi.fn()} questionIds={POOL} teammateQuestion={teammateQuestion} />);
	}

	// A teammate's tab, found by the name it starts with.
	function tabOf(name: string) {
		return screen.getByRole('tab', { name: new RegExp(`^${name}`) });
	}

	it('US-6-T-13 shows "Q2" after the name of a teammate who edited the second question', () => {
		renderSwitcher([player('u2', 'Grace')], { u2: 7 });

		expect(tabOf('Grace').textContent).toBe('GraceQ2');
	});

	it('US-6-T-13 shows the question in muted text', () => {
		renderSwitcher([player('u2', 'Grace')], { u2: 7 });

		expect(within(tabOf('Grace')).getByText('Q2').className).toContain('text-muted');
	});

	it('US-6-T-13 shows only the name of a teammate who has not edited anything', () => {
		renderSwitcher([player('u2', 'Grace'), player('u3', 'Katherine')], { u2: 7 });

		expect(tabOf('Katherine').textContent).toBe('Katherine');
	});

	it('US-6-T-13 numbers the question by its position in the pool, not its question id', () => {
		renderSwitcher([player('u2', 'Grace')], { u2: 9 });

		expect(tabOf('Grace').textContent).toBe('GraceQ3');
	});

	it('US-6-T-13 never shows a question on the "You" tab', () => {
		renderSwitcher([player('u2', 'Grace')], { u2: 7, u1: 4 });

		expect(screen.getByRole('tab', { name: 'You' }).textContent).toBe('You');
	});

	it('US-6-T-13 still shows the disconnected icon on a disconnected teammate with a question', () => {
		renderSwitcher([player('u2', 'Grace', false)], { u2: 7 });

		expect(within(tabOf('Grace')).getByTestId('disconnected-icon')).toBeTruthy();
	});

	it('US-6-T-13 still fades a disconnected teammate with a question', () => {
		renderSwitcher([player('u2', 'Grace', false)], { u2: 7 });

		expect(tabOf('Grace').className).toContain('opacity-50');
	});
});

describe('game page teammate question', () => {
	// The playing match as GameService sends it: Ada (the signed-in user) with
	// teammates Grace and Katherine, Alan on the other team, three questions.
	const PLAYING = {
		gameId: 'game-1',
		phase: 'playing',
		startedAt: Date.now(),
		secondsRemaining: 20 * 60,
		banSecondsRemaining: 0,
		pickSecondsRemaining: 0,
		scores: { a: 0, b: 0 },
		// Grace (u2) picked question 2 for herself (US-8-2), matching the
		// question she's shown editing below.
		problemPool: [1, 2, 3].map((questionId) => ({
			taskId: `problem-${questionId}`,
			questionId,
			difficulty: 'Easy',
			topics: [],
			bannedBy: null,
			pickedBy: { a: questionId === 2 ? { userId: 'u2', displayName: 'Grace', team: 'a' } : null, b: null },
		})),
		players: [player('u1', 'Ada'), player('u2', 'Grace'), player('u3', 'Katherine'), { ...player('u4', 'Alan'), team: 'b' }],
		forfeitVotes: { a: 0, b: 0 },
	};

	// Opens the game page, lets the fake socket connect and send the match,
	// then Grace edits question 1 and then question 2.
	async function renderPlayingGame() {
		render(<GamePage />);
		act(() => {
			fake.fire('connect');
			fake.fire('game:state', PLAYING);
			fake.fire('game:code', codeEntry('u2', 1));
			fake.fire('game:code', codeEntry('u2', 2));
		});
		await screen.findByRole('heading', { name: /1\. Problem Number 1/ });
	}

	it('US-6-T-13 shows "Q2" on the tab of a teammate who edited question 2', async () => {
		await renderPlayingGame();

		expect(screen.getByRole('tab', { name: /^Grace/ }).textContent).toBe('GraceQ2');
	});

	it('US-6-T-13 shows no question on the tab of a teammate who has not edited anything', async () => {
		await renderPlayingGame();

		expect(screen.getByRole('tab', { name: /^Katherine/ }).textContent).toBe('Katherine');
	});

	it('US-6-T-13 opens a teammate\'s workspace on the question they last edited', async () => {
		await renderPlayingGame();

		await userEvent.click(screen.getByRole('tab', { name: /^Grace/ }));

		expect(await screen.findByRole('heading', { name: /2\. Problem Number 2/ })).toBeTruthy();
	});
});
