// US-7-T-2: Ladder matchmaking queues: Ladder page (app/ladder/page.tsx)
// Acceptance criteria covered:
//   - The page shows 1v1, 2v2 and 3v3 queues (join buttons and waiting counts)
//   - A found match takes the player to /game/<gameId>
//   - While waiting, the page says "Waiting for a <mode> match"
//   - A waiting player can join a different queue
//   - A "Leave queue" button shows while waiting and sends queue:leave
//   - A QueueService error is shown to the player
// The queue socket context is mocked; `emit` records what the page sends,
// so nothing here talks to QueueService.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fakeUser } from './helpers';

const ladderMocks = vi.hoisted(() => ({
	useQueueSocket: vi.fn(),
	emit: vi.fn(),
	connect: vi.fn(),
	push: vi.fn(),
}));

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: ladderMocks.push, replace: vi.fn() }) }));
vi.mock('../app/login/context', () => ({ useAuth: () => ({ user: fakeUser, isLoading: false }) }));
vi.mock('../app/ladder/socket-context', () => ({
	useQueueSocket: () => ladderMocks.useQueueSocket(),
}));

import LadderPage from '../app/ladder/page';

type QueueMode = '1v1' | '2v2' | '3v3';

interface QueueOptions {
	queue?: QueueMode | null;
	counts?: Partial<Record<QueueMode, number>>;
	context?: Record<string, unknown>;
}

// Default: connected, not queued, nobody waiting, no match, no error.
function configureQueue({ queue = null, counts = {}, context = {} }: QueueOptions = {}) {
	ladderMocks.useQueueSocket.mockReturnValue({
		socket: { connected: true, emit: ladderMocks.emit },
		connected: true,
		queue: { queue, counts: { '1v1': 0, '2v2': 0, '3v3': 0, ...counts } },
		matched: null,
		error: null,
		connect: ladderMocks.connect,
		...context,
	});
}

beforeEach(() => {
	vi.clearAllMocks();
	configureQueue();
});

afterEach(() => cleanup());

describe('US-7-T-2 Ladder page queues (criterion 2)', () => {
	it('US-7-T-2 shows Ladder as the page heading', () => {
		render(<LadderPage />);

		expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Ladder');
	});

	it.each(['1v1', '2v2', '3v3'])('US-7-T-2 shows a button to join the %s queue', (mode) => {
		render(<LadderPage />);

		expect(screen.getByRole('button', { name: `Join ${mode}` })).toBeTruthy();
	});

	it('US-7-T-2 connects to QueueService when the page opens', () => {
		render(<LadderPage />);

		expect(ladderMocks.connect).toHaveBeenCalled();
	});

	it('US-7-T-2 shows how many players are waiting in each queue', () => {
		configureQueue({ counts: { '2v2': 3 } });
		render(<LadderPage />);

		// US-10-T-9: the arena cards say "N of M players" under the seat bars.
		expect(screen.getByText('3 of 4 players')).toBeTruthy();
	});

	it('US-7-T-2 disables the join buttons while QueueService is not connected', () => {
		configureQueue({ context: { connected: false } });
		render(<LadderPage />);

		expect((screen.getByRole('button', { name: 'Join 1v1' }) as HTMLButtonElement).disabled).toBe(true);
	});
});

describe('US-7-T-2 joining and waiting (criteria 6 and 7)', () => {
	it.each(['1v1', '2v2', '3v3'])('US-7-T-2 sends queue:join with %s when its join button is clicked', async (mode) => {
		render(<LadderPage />);
		await userEvent.click(screen.getByRole('button', { name: `Join ${mode}` }));

		expect(ladderMocks.emit).toHaveBeenCalledWith('queue:join', mode);
	});

	it('US-7-T-2 shows the player waiting for a match in the queue they joined', () => {
		configureQueue({ queue: '2v2', counts: { '2v2': 1 } });
		render(<LadderPage />);

		// US-10-T-9: the heading reads "Finding players" and the 2v2 card is marked queued.
		expect(document.querySelector('[data-mode="2v2"]')?.getAttribute('data-state')).toBe('queued');
	});

	it('US-7-T-2 does not show the player waiting when they are not in a queue', () => {
		render(<LadderPage />);

		expect(document.querySelector('[data-state="queued"]')).toBeNull();
	});

	it('US-7-T-2 lets a player waiting in 1v1 join the 3v3 queue instead', async () => {
		configureQueue({ queue: '1v1', counts: { '1v1': 1 } });
		render(<LadderPage />);
		await userEvent.click(screen.getByRole('button', { name: 'Join 3v3' }));

		expect(ladderMocks.emit).toHaveBeenCalledWith('queue:join', '3v3');
	});
});

describe('US-7-T-2 leaving a queue (criterion 8)', () => {
	it('US-7-T-2 shows a Leave queue button while the player is waiting', () => {
		configureQueue({ queue: '1v1', counts: { '1v1': 1 } });
		render(<LadderPage />);

		expect(screen.getByRole('button', { name: 'Leave queue' })).toBeTruthy();
	});

	it('US-7-T-2 sends queue:leave when Leave queue is clicked', async () => {
		configureQueue({ queue: '1v1', counts: { '1v1': 1 } });
		render(<LadderPage />);
		await userEvent.click(screen.getByRole('button', { name: 'Leave queue' }));

		expect(ladderMocks.emit).toHaveBeenCalledWith('queue:leave');
	});

	it('US-7-T-2 hides the Leave queue button when the player is not in a queue', () => {
		render(<LadderPage />);

		expect(screen.queryByRole('button', { name: 'Leave queue' })).toBeNull();
	});
});

describe('US-7-T-2 match found (criterion 3)', () => {
	it('US-7-T-2 takes the player to the new game once a match is found', () => {
		// US-10-T-9: after the 2-1 countdown, not straight away.
		vi.useFakeTimers();
		configureQueue({ context: { matched: { gameId: 'game-1' } } });
		render(<LadderPage />);
		act(() => {
			vi.advanceTimersByTime(2000);
		});
		vi.useRealTimers();

		expect(ladderMocks.push).toHaveBeenCalledWith('/game/game-1');
	});

	it('US-7-T-2 stays on the Ladder page while no match has been found', () => {
		configureQueue({ queue: '1v1', counts: { '1v1': 1 } });
		render(<LadderPage />);

		expect(ladderMocks.push).not.toHaveBeenCalled();
	});
});

describe('US-7-T-2 errors (criterion 11)', () => {
	it('US-7-T-2 shows the error QueueService sent when the match could not be created', () => {
		configureQueue({
			queue: '1v1',
			counts: { '1v1': 2 },
			context: { error: { code: 'game-start-failed', message: 'The match could not be started. You are still in the queue.' } },
		});
		render(<LadderPage />);

		expect(screen.getByRole('alert').textContent).toBe('The match could not be started. You are still in the queue.');
	});

	it('US-7-T-2 shows no error when there is none', () => {
		render(<LadderPage />);

		expect(screen.queryByRole('alert')).toBeNull();
	});
});
