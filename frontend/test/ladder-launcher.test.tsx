// US-10-T-10: the Ladder launcher (app/ladder/page.tsx).
// Pseudocode: test/ladder-v2-test-pseudo.md, sections "Ladder: before queueing",
// "Ladder: queueing" and "Ladder: team columns".
// The queue socket context is mocked: `emit` records what the page sends and
// each test sets the queue state it needs, so nothing here talks to QueueService.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fakeUser } from './helpers';

const mocks = vi.hoisted(() => ({
	useQueueSocket: vi.fn(),
	emit: vi.fn(),
	connect: vi.fn(),
	push: vi.fn(),
}));

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mocks.push, replace: vi.fn() }) }));
vi.mock('../app/login/context', () => ({ useAuth: () => ({ user: fakeUser, isLoading: false }) }));
vi.mock('../app/ladder/socket-context', async (importOriginal) => ({
	...(await importOriginal<typeof import('../app/ladder/socket-context')>()),
	useQueueSocket: () => mocks.useQueueSocket(),
}));

import LadderPage from '../app/ladder/page';

type QueueMode = '1v1' | '2v2' | '3v3';

// Connected, not queued and nobody waiting unless a test says otherwise.
function setQueue(queue: QueueMode | null = null, counts: Partial<Record<QueueMode, number>> = {}, context: Record<string, unknown> = {}) {
	mocks.useQueueSocket.mockReturnValue({
		socket: { connected: true, emit: mocks.emit },
		connected: true,
		queue: { queue, counts: { '1v1': 0, '2v2': 0, '3v3': 0, ...counts } },
		matched: null,
		error: null,
		connect: mocks.connect,
		...context,
	});
}

// Opens the Team size dropdown (named after its current value) and picks `size`.
async function pickSize(size: QueueMode) {
	await userEvent.click(screen.getByRole('button', { name: /^Team size/ }));
	await userEvent.click(screen.getByRole('button', { name: size }));
}

const seats = (column: string) => screen.getByRole('complementary', { name: column }).querySelectorAll('[data-seat]');
// The name written on a seat (the YOU tag sits beside it, not in it).
const seatName = (column: string, seat: number) => seats(column)[seat].querySelector('[data-seat-name]')?.textContent;
const filledSeats = () => document.querySelectorAll('[data-seat][data-filled="true"]');

beforeEach(() => {
	vi.clearAllMocks();
	setQueue();
});

afterEach(() => {
	cleanup();
	vi.useRealTimers();
});

describe('US-10-T-10 Ladder before queueing', () => {
	it('US-10-T-10 reads Ladder as the page heading', () => {
		render(<LadderPage />);

		expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Ladder');
	});

	it('US-10-T-10 starts the Team size dropdown on 2v2', () => {
		render(<LadderPage />);

		// The tile is named after its current value, so a screen reader hears the choice.
		expect(screen.getByRole('button', { name: 'Team size 2v2' })).toBeTruthy();
	});

	it('US-10-T-10 offers 1v1, 2v2 and 3v3 in the Team size dropdown', async () => {
		render(<LadderPage />);
		await userEvent.click(screen.getByRole('button', { name: 'Team size 2v2' }));

		// The open menu lists exactly the three sizes, in order.
		const options = ['1v1', '2v2', '3v3'].filter((size) => screen.queryByRole('button', { name: size }));
		expect(options).toEqual(['1v1', '2v2', '3v3']);
	});

	it('US-10-T-10 shows 3v3 in the Team size dropdown after picking it', async () => {
		render(<LadderPage />);
		await pickSize('3v3');

		expect(screen.getByRole('button', { name: 'Team size 3v3' })).toBeTruthy();
	});

	it('US-10-T-10 shows Classic in the Gamemode dropdown', () => {
		render(<LadderPage />);

		expect(screen.getByRole('button', { name: 'Gamemode Classic' })).toBeTruthy();
	});

	it('US-10-T-10 offers only Classic in the Gamemode dropdown', async () => {
		render(<LadderPage />);
		await userEvent.click(screen.getByRole('button', { name: 'Gamemode Classic' }));

		// The menu is the element right after the tile; it holds one option.
		const menu = screen.getByRole('button', { name: 'Gamemode Classic' }).nextElementSibling;
		expect(Array.from(menu?.querySelectorAll('button') ?? [], (button) => button.textContent)).toEqual(['Classic']);
	});

	it('US-10-T-10 has a Rank section', () => {
		render(<LadderPage />);

		expect(screen.getByRole('region', { name: 'Rank' })).toBeTruthy();
	});

	it('US-10-T-10 has one PLAY button', () => {
		render(<LadderPage />);

		expect(screen.getAllByRole('button', { name: 'PLAY' }).length).toBe(1);
	});

	it('US-10-T-10 disables PLAY while QueueService is not connected', () => {
		setQueue(null, {}, { connected: false });
		render(<LadderPage />);

		expect((screen.getByRole('button', { name: 'PLAY' }) as HTMLButtonElement).disabled).toBe(true);
	});

	it('US-10-T-10 shows no YOUR TEAM column before queueing', () => {
		render(<LadderPage />);

		// The team columns only appear once the player presses Play.
		expect(screen.queryByRole('complementary', { name: 'Your team' })).toBeNull();
	});

	it('US-10-T-10 shows no RIVALS column before queueing', () => {
		render(<LadderPage />);

		expect(screen.queryByRole('complementary', { name: 'Rivals' })).toBeNull();
	});

	it('US-10-T-10 shows no Leave button before queueing', () => {
		render(<LadderPage />);

		expect(screen.queryByRole('button', { name: 'Leave' })).toBeNull();
	});
});

describe('US-10-T-10 Ladder queueing', () => {
	it('US-10-T-10 sends queue:join "2v2" when PLAY is clicked', async () => {
		render(<LadderPage />);
		await userEvent.click(screen.getByRole('button', { name: 'PLAY' }));

		expect(mocks.emit).toHaveBeenCalledWith('queue:join', '2v2');
	});

	it('US-10-T-10 sends queue:join "3v3" after picking 3v3 and clicking PLAY', async () => {
		render(<LadderPage />);
		await pickSize('3v3');
		await userEvent.click(screen.getByRole('button', { name: 'PLAY' }));

		expect(mocks.emit).toHaveBeenCalledWith('queue:join', '3v3');
	});

	it('US-10-T-10 shows WAITING instead of PLAY while queued', () => {
		setQueue('2v2', { '2v2': 1 });
		render(<LadderPage />);

		expect(screen.getByRole('status').textContent).toContain('WAITING');
	});

	it('US-10-T-10 starts the queue timer at 0:00', () => {
		setQueue('2v2', { '2v2': 1 });
		render(<LadderPage />);

		expect(screen.getByTestId('queue-timer').textContent).toBe('0:00');
	});

	it('US-10-T-10 counts the queue timer up to 0:07 after 7 seconds', () => {
		vi.useFakeTimers();
		setQueue('2v2', { '2v2': 1 });
		render(<LadderPage />);
		act(() => {
			vi.advanceTimersByTime(7000);
		});

		expect(screen.getByTestId('queue-timer').textContent).toBe('0:07');
	});

	it('US-10-T-10 shows a Leave button while queued', () => {
		setQueue('2v2', { '2v2': 1 });
		render(<LadderPage />);

		expect(screen.getByRole('button', { name: 'Leave' })).toBeTruthy();
	});

	it('US-10-T-10 sends queue:leave when Leave is clicked', async () => {
		setQueue('2v2', { '2v2': 1 });
		render(<LadderPage />);
		await userEvent.click(screen.getByRole('button', { name: 'Leave' }));

		expect(mocks.emit).toHaveBeenCalledWith('queue:leave');
	});

	it('US-10-T-10 disables the Team size dropdown while queued', () => {
		setQueue('2v2', { '2v2': 1 });
		render(<LadderPage />);

		expect((screen.getByRole('button', { name: 'Team size 2v2' }) as HTMLButtonElement).disabled).toBe(true);
	});

	it('US-10-T-10 disables the Gamemode dropdown while queued', () => {
		setQueue('2v2', { '2v2': 1 });
		render(<LadderPage />);

		expect((screen.getByRole('button', { name: 'Gamemode Classic' }) as HTMLButtonElement).disabled).toBe(true);
	});

	it('US-10-T-10 shows how many players are waiting in the queue', () => {
		setQueue('2v2', { '2v2': 3 });
		render(<LadderPage />);

		expect(screen.getByTestId('in-queue').textContent).toBe('3');
	});
});

describe('US-10-T-10 Ladder team columns', () => {
	it('US-10-T-10 shows a YOUR TEAM column while queued', () => {
		setQueue('2v2', { '2v2': 1 });
		render(<LadderPage />);

		expect(screen.getByRole('complementary', { name: 'Your team' })).toBeTruthy();
	});

	it('US-10-T-10 shows a RIVALS column while queued', () => {
		setQueue('2v2', { '2v2': 1 });
		render(<LadderPage />);

		expect(screen.getByRole('complementary', { name: 'Rivals' })).toBeTruthy();
	});

	it('US-10-T-10 shows 2 seats under YOUR TEAM in a 2v2', () => {
		setQueue('2v2', { '2v2': 1 });
		render(<LadderPage />);

		expect(seats('Your team').length).toBe(2);
	});

	it('US-10-T-10 shows 3 seats under RIVALS in a 3v3', () => {
		setQueue('3v3', { '3v3': 1 });
		render(<LadderPage />);

		expect(seats('Rivals').length).toBe(3);
	});

	it('US-10-T-10 fills 1 of 4 seats with only the player waiting in 2v2', () => {
		setQueue('2v2', { '2v2': 1 });
		render(<LadderPage />);

		expect(filledSeats().length).toBe(1);
	});

	it('US-10-T-10 fills 3 of 4 seats with 3 players waiting in 2v2', () => {
		setQueue('2v2', { '2v2': 3 });
		render(<LadderPage />);

		expect(filledSeats().length).toBe(3);
	});

	it('US-10-T-10 reads 2 / 2 under YOUR TEAM with 3 players waiting in 2v2', () => {
		setQueue('2v2', { '2v2': 3 });
		render(<LadderPage />);

		// Seats fill in match order: the player's team first, then the rivals.
		expect(screen.getByTestId('your-team-count').textContent).toBe('2 / 2');
	});

	it('US-10-T-10 reads 1 / 2 under RIVALS with 3 players waiting in 2v2', () => {
		setQueue('2v2', { '2v2': 3 });
		render(<LadderPage />);

		expect(screen.getByTestId('rivals-count').textContent).toBe('1 / 2');
	});

	it('US-10-T-10 shows the player\'s name on their own seat', () => {
		setQueue('2v2', { '2v2': 1 });
		render(<LadderPage />);

		// fakeUser is Ada, so her seat (the first under YOUR TEAM) shows her
		// name. Names, not initials: there are no player icons yet.
		expect(seatName('Your team', 0)).toBe('Ada');
	});

	it('US-10-T-10 reads Player found on a filled seat that is not the player\'s', () => {
		setQueue('2v2', { '2v2': 2 });
		render(<LadderPage />);

		// The second player is Ada's teammate, but QueueService only sends
		// names with the match, so the seat says someone is there.
		expect(seatName('Your team', 1)).toBe('Player found');
	});

	it('US-10-T-10 reads Searching on an open seat', () => {
		setQueue('2v2', { '2v2': 1 });
		render(<LadderPage />);

		expect(seatName('Rivals', 0)).toBe('Searching');
	});

	it('US-10-T-10 shows the rivals\' names on their seats once a match is found', () => {
		setQueue(null, {}, { matched: { gameId: 'game-1', yourTeam: ['Ada', 'Linus'], rivals: ['Ken', 'Barbara'] } });
		render(<LadderPage />);

		expect([seatName('Rivals', 0), seatName('Rivals', 1)]).toEqual(['Ken', 'Barbara']);
	});
});
