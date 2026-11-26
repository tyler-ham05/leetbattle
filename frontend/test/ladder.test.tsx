// US-9-T-2: Ladder matchmaking queues: Ladder page (app/ladder/page.tsx)
// Acceptance criteria covered:
//   - The Team size menu offers 1v1, 2v2 and 3v3; PLAY joins the chosen queue
//   - The queued player sees how many are in the queue
//   - A found match takes the player to /game/<gameId> after the match-start screen
//   - While waiting, PLAY is replaced by a WAITING status
//   - A "Leave" button shows while waiting and sends queue:leave
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

describe('US-9-T-2 Ladder page queues (criterion 2)', () => {
	it('US-9-T-2 shows Ladder as the page heading', () => {
		render(<LadderPage />);

		expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Ladder');
	});

	// US-10-T-10: there are no per-queue join buttons any more; the sizes live in the Team size menu.
	it.each(['1v1', '2v2', '3v3'])('US-9-T-2 offers the %s queue in the Team size menu', async (mode) => {
		render(<LadderPage />);
		await userEvent.click(screen.getByRole('button', { name: 'Team size 2v2' }));

		expect(screen.getByRole('button', { name: mode })).toBeTruthy();
	});

	it('US-9-T-2 connects to QueueService when the page opens', () => {
		render(<LadderPage />);

		expect(ladderMocks.connect).toHaveBeenCalled();
	});

	it('US-9-T-2 shows how many players are waiting in each queue', () => {
		configureQueue({ queue: '2v2', counts: { '2v2': 3 } });
		render(<LadderPage />);

		// US-10-T-10: there is no per-queue count; the queued player sees the IN QUEUE number for their queue.
		expect(screen.getByTestId('in-queue').textContent).toBe('3');
	});

	it('US-9-T-2 disables the join buttons while QueueService is not connected', () => {
		configureQueue({ context: { connected: false } });
		render(<LadderPage />);

		// US-10-T-10: the only join button is PLAY.
		expect((screen.getByRole('button', { name: 'PLAY' }) as HTMLButtonElement).disabled).toBe(true);
	});
});

describe('US-9-T-2 joining and waiting (criteria 6 and 7)', () => {
	it.each(['1v1', '2v2', '3v3'])('US-9-T-2 sends queue:join with %s when PLAY is clicked', async (mode) => {
		render(<LadderPage />);
		// US-10-T-10: pick the size in the Team size menu, then click PLAY.
		await userEvent.click(screen.getByRole('button', { name: 'Team size 2v2' }));
		await userEvent.click(screen.getByRole('button', { name: mode }));
		await userEvent.click(screen.getByRole('button', { name: 'PLAY' }));

		expect(ladderMocks.emit).toHaveBeenCalledWith('queue:join', mode);
	});

	it('US-9-T-2 shows the player waiting for a match in the queue they joined', () => {
		configureQueue({ queue: '2v2', counts: { '2v2': 1 } });
		render(<LadderPage />);

		// US-10-T-10: PLAY is replaced by a WAITING status (no "Finding players" heading or card state).
		expect(screen.getByRole('status').textContent).toContain('WAITING');
	});

	it('US-9-T-2 does not show the player waiting when they are not in a queue', () => {
		render(<LadderPage />);

		// US-10-T-10: no WAITING status when not queued.
		expect(screen.queryByRole('status')).toBeNull();
	});

	// US-10-T-10: "lets a player waiting in 1v1 join the 3v3 queue instead" is removed;
	// the player leaves first, then picks another size.
});

describe('US-9-T-2 leaving a queue (criterion 8)', () => {
	it('US-9-T-2 shows a Leave button while the player is waiting', () => {
		configureQueue({ queue: '1v1', counts: { '1v1': 1 } });
		render(<LadderPage />);

		// US-10-T-10: the button is named "Leave" (was "Leave queue").
		expect(screen.getByRole('button', { name: 'Leave' })).toBeTruthy();
	});

	it('US-9-T-2 sends queue:leave when Leave is clicked', async () => {
		configureQueue({ queue: '1v1', counts: { '1v1': 1 } });
		render(<LadderPage />);
		await userEvent.click(screen.getByRole('button', { name: 'Leave' }));

		expect(ladderMocks.emit).toHaveBeenCalledWith('queue:leave');
	});

	it('US-9-T-2 hides the Leave button when the player is not in a queue', () => {
		render(<LadderPage />);

		expect(screen.queryByRole('button', { name: 'Leave' })).toBeNull();
	});
});

describe('US-9-T-2 match found (criterion 3)', () => {
	it('US-9-T-2 takes the player to the new game once a match is found', () => {
		// US-10-T-10: after the match-start screen (600 ms + 2800 ms = 3400 ms), not straight away.
		vi.useFakeTimers();
		configureQueue({ context: { matched: { gameId: 'game-1' } } });
		render(<LadderPage />);
		act(() => {
			vi.advanceTimersByTime(3400);
		});
		vi.useRealTimers();

		expect(ladderMocks.push).toHaveBeenCalledWith('/game/game-1');
	});

	it('US-9-T-2 stays on the Ladder page while no match has been found', () => {
		configureQueue({ queue: '1v1', counts: { '1v1': 1 } });
		render(<LadderPage />);

		expect(ladderMocks.push).not.toHaveBeenCalled();
	});
});

describe('US-9-T-2 errors (criterion 11)', () => {
	it('US-9-T-2 shows the error QueueService sent when the match could not be created', () => {
		configureQueue({
			queue: '1v1',
			counts: { '1v1': 2 },
			context: { error: { code: 'game-start-failed', message: 'The match could not be started. You are still in the queue.' } },
		});
		render(<LadderPage />);

		expect(screen.getByRole('alert').textContent).toBe('The match could not be started. You are still in the queue.');
	});

	it('US-9-T-2 shows no error when there is none', () => {
		render(<LadderPage />);

		expect(screen.queryByRole('alert')).toBeNull();
	});
});
