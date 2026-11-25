// US-10-T-9: Ladder arena cards (app/ladder/page.tsx).
// Pseudocode: test/ladder-busy-test-pseudo.md, the "Ladder" sections.
// The Ladder shows one card per queue with a thin bar per seat, marks the card
// the player is queued in (edge light, timer, Leave queue) and, once a match
// is found, plays a reveal and a 2-1 countdown before opening the game.
// The queue socket context and the router are mocked: nothing here talks to
// QueueService or GameService.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen, within } from '@testing-library/react';
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

// A card by its mode. Found through data-mode rather than its role, because
// the cards that leave after a match are hidden from screen readers.
const card = (mode: QueueMode) => document.querySelector(`[data-mode="${mode}"]`) as HTMLElement;
const seats = (mode: QueueMode) => [...card(mode).querySelectorAll('[data-seat]')] as HTMLElement[];

// The player queues for `mode`, then QueueService says the match is on.
// QueueService takes them out of the queue as it matches them, so the second
// render has no queue, like the real socket.
function renderMatched(mode: QueueMode) {
	const counts = { [mode]: { '1v1': 2, '2v2': 4, '3v3': 6 }[mode] };
	configureQueue({ queue: mode, counts });
	const view = render(<LadderPage />);
	configureQueue({ queue: null, counts, context: { matched: { gameId: 'game-1' } } });
	view.rerender(<LadderPage />);
	return view;
}

beforeEach(() => {
	vi.clearAllMocks();
	configureQueue();
});

afterEach(() => {
	cleanup();
	vi.useRealTimers();
});

describe('US-10-T-9 Ladder heading', () => {
	it('US-10-T-9 reads "Ladder" when the player is not queued', () => {
		render(<LadderPage />);
		expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Ladder');
	});

	it('US-10-T-9 says "Queue for a 1v1, 2v2 or 3v3 match" under the heading when not queued', () => {
		render(<LadderPage />);
		expect(screen.getByText('Queue for a 1v1, 2v2 or 3v3 match')).toBeTruthy();
	});

	it('US-10-T-9 reads "Finding players" while the player is queued', () => {
		configureQueue({ queue: '2v2', counts: { '2v2': 1 } });
		render(<LadderPage />);
		expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Finding players');
	});
});

describe('US-10-T-9 Ladder arena cards', () => {
	it.each(['1v1', '2v2', '3v3'])('US-10-T-9 has a section named "%s queue"', (mode) => {
		render(<LadderPage />);
		expect(screen.getByRole('region', { name: `${mode} queue` })).toBeTruthy();
	});

	it('US-10-T-9 shows 6 seat bars on the 3v3 card', () => {
		render(<LadderPage />);
		expect(seats('3v3').length).toBe(6);
	});

	it('US-10-T-9 fills 2 of the 3v3 seat bars when 2 players are waiting', () => {
		configureQueue({ counts: { '3v3': 2 } });
		render(<LadderPage />);
		expect(seats('3v3').filter((seat) => seat.dataset.filled === 'true').length).toBe(2);
	});

	it('US-10-T-9 says "2 of 6 players" on the 3v3 card when 2 players are waiting', () => {
		configureQueue({ counts: { '3v3': 2 } });
		render(<LadderPage />);
		expect(within(card('3v3')).getByText('2 of 6 players')).toBeTruthy();
	});

	it.each(['1v1', '2v2', '3v3'])('US-10-T-9 has a "Join %s" button on its card', (mode) => {
		render(<LadderPage />);
		expect(within(card(mode as QueueMode)).getByRole('button', { name: `Join ${mode}` })).toBeTruthy();
	});

	it('US-10-T-9 sends queue:join "2v2" when "Join 2v2" is clicked', async () => {
		render(<LadderPage />);
		await userEvent.click(screen.getByRole('button', { name: 'Join 2v2' }));
		expect(ladderMocks.emit).toHaveBeenCalledWith('queue:join', '2v2');
	});

	it('US-10-T-9 disables the join buttons while QueueService is not connected', () => {
		configureQueue({ context: { connected: false } });
		render(<LadderPage />);
		expect((screen.getByRole('button', { name: 'Join 3v3' }) as HTMLButtonElement).disabled).toBe(true);
	});
});

describe('US-10-T-9 Ladder while queued', () => {
	it('US-10-T-9 marks the 2v2 card as queued', () => {
		configureQueue({ queue: '2v2', counts: { '2v2': 1 } });
		render(<LadderPage />);
		expect(card('2v2').dataset.state).toBe('queued');
	});

	it.each(['1v1', '3v3'])('US-10-T-9 dims the %s card while the player is queued for 2v2', (mode) => {
		configureQueue({ queue: '2v2', counts: { '2v2': 1 } });
		render(<LadderPage />);
		expect(card(mode as QueueMode).dataset.state).toBe('dim');
	});

	it('US-10-T-9 shows a timer reading 0:00 on the 2v2 card when the player joins', () => {
		configureQueue({ queue: '2v2', counts: { '2v2': 1 } });
		render(<LadderPage />);
		expect(within(card('2v2')).getByText('0:00')).toBeTruthy();
	});

	it('US-10-T-9 counts the timer up to 0:07 after 7 seconds in the queue', () => {
		vi.useFakeTimers();
		configureQueue({ queue: '2v2', counts: { '2v2': 1 } });
		render(<LadderPage />);
		act(() => {
			vi.advanceTimersByTime(7000);
		});
		expect(within(card('2v2')).getByText('0:07')).toBeTruthy();
	});

	it('US-10-T-9 shows "Leave queue" on the 2v2 card while queued for 2v2', () => {
		configureQueue({ queue: '2v2', counts: { '2v2': 1 } });
		render(<LadderPage />);
		expect(within(card('2v2')).getByRole('button', { name: 'Leave queue' })).toBeTruthy();
	});

	it('US-10-T-9 sends queue:leave when "Leave queue" is clicked', async () => {
		configureQueue({ queue: '2v2', counts: { '2v2': 1 } });
		render(<LadderPage />);
		await userEvent.click(screen.getByRole('button', { name: 'Leave queue' }));
		expect(ladderMocks.emit).toHaveBeenCalledWith('queue:leave');
	});

	it('US-10-T-9 lets a player queued for 1v1 switch by clicking "Join 3v3"', async () => {
		configureQueue({ queue: '1v1', counts: { '1v1': 1 } });
		render(<LadderPage />);
		await userEvent.click(screen.getByRole('button', { name: 'Join 3v3' }));
		expect(ladderMocks.emit).toHaveBeenCalledWith('queue:join', '3v3');
	});

	it('US-10-T-9 shows no "Leave queue" button when the player is not queued', () => {
		render(<LadderPage />);
		expect(screen.queryByRole('button', { name: 'Leave queue' })).toBeNull();
	});
});

describe('US-10-T-9 Ladder match found', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	it('US-10-T-9 shows "Match found" once a match is found', () => {
		renderMatched('2v2');
		expect(screen.getByText('Match found')).toBeTruthy();
	});

	it('US-10-T-9 starts the countdown at 2', () => {
		renderMatched('2v2');
		expect(screen.getByTestId('match-countdown').textContent).toBe('2');
	});

	it('US-10-T-9 shows 1 on the countdown one second later', () => {
		renderMatched('2v2');
		act(() => {
			vi.advanceTimersByTime(1000);
		});
		expect(screen.getByTestId('match-countdown').textContent).toBe('1');
	});

	it('US-10-T-9 does not open the game before the countdown ends', () => {
		renderMatched('2v2');
		act(() => {
			vi.advanceTimersByTime(1999);
		});
		expect(ladderMocks.push).not.toHaveBeenCalled();
	});

	it('US-10-T-9 opens /game/<gameId> when the countdown ends', () => {
		renderMatched('2v2');
		act(() => {
			vi.advanceTimersByTime(2000);
		});
		expect(ladderMocks.push).toHaveBeenCalledWith('/game/game-1');
	});

	it('US-10-T-9 marks the chosen card as found', () => {
		renderMatched('2v2');
		expect(card('2v2').dataset.state).toBe('found');
	});

	it.each(['1v1', '3v3'])('US-10-T-9 marks the %s card as leaving after a 2v2 match is found', (mode) => {
		renderMatched('2v2');
		expect(card(mode as QueueMode).dataset.state).toBe('leaving');
	});

	it('US-10-T-9 hides the leaving cards from screen readers', () => {
		renderMatched('2v2');
		expect(card('3v3').closest('[aria-hidden="true"]')).not.toBeNull();
	});

	it('US-10-T-9 shows "Your team" on the chosen card after a 2v2 match is found', () => {
		renderMatched('2v2');
		expect(within(card('2v2')).getByText('Your team')).toBeTruthy();
	});

	it('US-10-T-9 shows "Rival team" on the chosen card after a 2v2 match is found', () => {
		renderMatched('2v2');
		expect(within(card('2v2')).getByText('Rival team')).toBeTruthy();
	});

	it('US-10-T-9 shows "You" on the chosen card after a 1v1 match is found', () => {
		renderMatched('1v1');
		expect(within(card('1v1')).getByText('You')).toBeTruthy();
	});

	it('US-10-T-9 shows "Rival" on the chosen card after a 1v1 match is found', () => {
		renderMatched('1v1');
		expect(within(card('1v1')).getByText('Rival')).toBeTruthy();
	});

	it.each([0, 1])('US-10-T-9 colors 2v2 seat bar %i in the Your team color once the match is found', (index) => {
		renderMatched('2v2');
		expect(seats('2v2')[index].className).toContain('bg-primary');
	});

	it.each([2, 3])('US-10-T-9 colors 2v2 seat bar %i in the Rival team color once the match is found', (index) => {
		renderMatched('2v2');
		expect(seats('2v2')[index].className).toContain('bg-secondary');
	});

	it('US-10-T-9 disables the join buttons once a match is found', () => {
		renderMatched('2v2');
		expect((within(card('3v3')).getByRole('button', { name: 'Join 3v3', hidden: true }) as HTMLButtonElement).disabled).toBe(true);
	});

	it('US-10-T-9 shows no "Leave queue" button once a match is found', () => {
		renderMatched('2v2');
		expect(screen.queryByRole('button', { name: 'Leave queue', hidden: true })).toBeNull();
	});
});

describe('US-10-T-9 Ladder errors (unchanged)', () => {
	it('US-10-T-9 still shows a QueueService error in an alert', () => {
		configureQueue({ context: { error: { code: 'game-start-failed', message: 'The match could not be started. You are still in the queue.' } } });
		render(<LadderPage />);
		expect(screen.getByRole('alert').textContent).toBe('The match could not be started. You are still in the queue.');
	});

	it('US-10-T-9 shows no alert when there is no error', () => {
		render(<LadderPage />);
		expect(screen.queryByRole('alert')).toBeNull();
	});
});
