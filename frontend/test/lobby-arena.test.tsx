// US5-Task20: lobby redesign ("E · Live" on the Lobby redesign canvas) and its loaders (UI only; the lobby socket is mocked, no backend)

// Loaders
//  - Opening the lobby should play the katana slice
//  - Opening the lobby should not play the team clash
//  - When the user's match is starting, the team clash ("Leet" VS "Battle") should play
//  - While the team clash is playing, the lobby should not have navigated to the game page yet
//  - Once the team clash has finished, the lobby should navigate to the game page
//  (the clash's VS losing its box is a CSS-only change in globals.css, checked by eye)

// Headline
//  - When 3 of 6 seats are filled, the headline should display "Waiting for 3 more"
//  - When all 6 seats are filled and 4 players are ready, the headline should display "4 of 6 ready"
//  - When all 6 seats are filled and every player is ready, the headline should display "Everyone is ready"
//  - During the countdown with 3 seconds left, the headline should display "3"
//  - During the countdown, screen readers should still hear "Starting match in 3…"

// Team bars
//  - With 2 of 3 Team 1 seats filled, Team 1's bar should be two thirds full
//  - With 1 of 3 Team 2 seats filled, Team 2's bar should be one third full
//  - During the countdown, both bars should be draining toward VS
//  - Each bar's empty track should use the line color, so it still shows in light mode

// Seats
//  - A ready player's row should be marked ready (the team-colour sweep)
//  - A player who is not ready should not be marked ready
//  - The user's own row should show "You"

// Choosing a team (open seats replace the "Join / Switch / Your team / Team full" buttons)
//  - When the user has no team, Team 1's open seat should be a "Join Team 1" button
//  - Clicking "Join Team 1" should send a join-team event with team "a"
//  - When the user is on Team 2 and Team 1 has an open seat, it should be a "Switch to Team 1" button
//  - When the user is on Team 1, Team 1's open seats should not be buttons
//  - The "Your team" button should no longer be shown
//  - An open seat the user can take should hold "Open seat" and "Join here" in the same spot, so one fades into the other
//  - An open seat's dashed outline should use the muted color at 40%, so it still shows in light mode
//  - An open seat on the user's own team (not a button) should use the same outline

// Display name (edited in the user's own row instead of a separate form)
//  - The user's row should have an "Edit your display name" button
//  - Clicking "Edit your display name" should show the "Display name" input
//  - Typing a new name and clicking "Save name" should send a set-name event with the trimmed name

// Top bar
//  - The "Players per team" control should be in the top bar
//  - The "Leave lobby" button should be in the top bar

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// The lobby never talks to LobbyService here: auth and the lobby socket are
// fakes, and `emit` records what the page would have sent.
const lobbyMocks = vi.hoisted(() => ({
	useAuth: vi.fn(),
	useLobbySocket: vi.fn(),
	emit: vi.fn(),
	push: vi.fn(),
}));

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: lobbyMocks.push, replace: vi.fn() }) }));
vi.mock('../app/login/context', () => ({ useAuth: () => lobbyMocks.useAuth() }));
vi.mock('../app/lobby/socket-context', () => ({ useLobbySocket: () => lobbyMocks.useLobbySocket() }));

import LobbyPage from '../app/lobby/page';
import { LOADER_MS } from '../app/_shared/page-loader';

type TeamId = 'a' | 'b';

function player(userId: string, displayName: string, team: TeamId | null, ready = false) {
	return { userId, displayName, team, connected: true, ready };
}

// The signed-in user is u1 ("Ada").
const ada = player('u1', 'Ada', 'a');
const grace = player('u2', 'Grace', 'a');
const katherine = player('u3', 'Katherine', 'a');
const alan = player('u4', 'Alan', 'b');
const edsger = player('u5', 'Edsger', 'b');
const margaret = player('u6', 'Margaret', 'b');

// Sets what useAuth and useLobbySocket return for the next render.
function configureLobby(players = [ada, grace, alan], lobby: Record<string, unknown> = {}, context: Record<string, unknown> = {}) {
	lobbyMocks.useAuth.mockReturnValue({ user: { id: 'u1', name: 'Ada', email: 'ada@example.test' }, isLoading: false });
	lobbyMocks.useLobbySocket.mockReturnValue({
		socket: { connected: true, emit: lobbyMocks.emit },
		connected: true,
		lobby: {
			players,
			playerCount: players.length,
			readyCount: players.filter((entry) => entry.ready).length,
			canReady: players.length === 6,
			readyToStart: false,
			countdownSecondsRemaining: null,
			teamSize: 3,
			hostId: 'u1',
			...lobby,
		},
		error: null,
		matchReadiness: null,
		gameStarted: null,
		connect: vi.fn(),
		clearError: vi.fn(),
		...context,
	});
}

// Everyone seated; the listed user ids are ready.
function fullLobby(...readyIds: string[]) {
	return [ada, grace, katherine, alan, edsger, margaret].map((entry) => ({ ...entry, ready: readyIds.includes(entry.userId) }));
}

// A match about to start for the signed-in user.
const starting = { matchReadiness: { lobbyId: 'main', players: fullLobby() }, gameStarted: { gameId: 'game-1' } };

function loaders() {
	return Array.from(document.querySelectorAll('[data-loader]')).map((element) => element.getAttribute('data-loader'));
}

// The page's top bar: the first banner.
function topBar() {
	return within(screen.getAllByRole('banner')[0]);
}

// A team's fill bar, as a number out of 100.
function barFill(team: TeamId) {
	return parseFloat((document.querySelector(`[data-team-bar="${team}"]`) as HTMLElement).style.width);
}

beforeEach(() => {
	vi.clearAllMocks();
	configureLobby();
});

afterEach(() => {
	cleanup();
	vi.useRealTimers();
});

describe('lobby loaders', () => {
	it('US5-Task20 plays the katana slice when the lobby opens', () => {
		render(<LobbyPage />);
		expect(loaders()).toContain('katana');
	});

	it('US5-Task20 does not play the team clash when the lobby opens', () => {
		render(<LobbyPage />);
		expect(loaders()).not.toContain('clash');
	});

	it('US5-Task20 plays the team clash when the user\'s match is starting', () => {
		configureLobby(fullLobby(), {}, starting);
		render(<LobbyPage />);
		expect(loaders()).toContain('clash');
	});

	it('US5-Task20 waits for the team clash before going to the game page', () => {
		vi.useFakeTimers();
		configureLobby(fullLobby(), {}, starting);
		render(<LobbyPage />);
		act(() => {
			vi.advanceTimersByTime(LOADER_MS.clash - 100);
		});
		expect(lobbyMocks.push).not.toHaveBeenCalled();
	});

	it('US5-Task20 goes to the game page once the team clash has finished', () => {
		vi.useFakeTimers();
		configureLobby(fullLobby(), {}, starting);
		render(<LobbyPage />);
		act(() => {
			vi.advanceTimersByTime(LOADER_MS.clash);
		});
		expect(lobbyMocks.push).toHaveBeenCalledWith('/game/game-1');
	});
});

describe('lobby headline', () => {
	it('US5-Task20 says "Waiting for 3 more" when 3 of 6 seats are filled', () => {
		render(<LobbyPage />);
		expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Waiting for 3 more');
	});

	it('US5-Task20 says "4 of 6 ready" when the lobby is full and 4 are ready', () => {
		configureLobby(fullLobby('u1', 'u2', 'u4', 'u5'));
		render(<LobbyPage />);
		expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('4 of 6 ready');
	});

	it('US5-Task20 says "Everyone is ready" when every player is ready', () => {
		configureLobby(fullLobby('u1', 'u2', 'u3', 'u4', 'u5', 'u6'));
		render(<LobbyPage />);
		expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Everyone is ready');
	});

	it('US5-Task20 shows the countdown digit as the headline', () => {
		configureLobby(fullLobby('u1', 'u2', 'u3', 'u4', 'u5', 'u6'), { countdownSecondsRemaining: 3 });
		render(<LobbyPage />);
		expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('3');
	});

	it('US5-Task20 still tells screen readers "Starting match in 3…" during the countdown', () => {
		configureLobby(fullLobby('u1', 'u2', 'u3', 'u4', 'u5', 'u6'), { countdownSecondsRemaining: 3 });
		render(<LobbyPage />);
		expect(screen.getByText('Starting match in 3…')).toBeTruthy();
	});
});

describe('lobby team bars', () => {
	it('US5-Task20 fills Team 1\'s bar two thirds when 2 of 3 seats are taken', () => {
		render(<LobbyPage />);
		expect(barFill('a')).toBeCloseTo(66.67, 1);
	});

	it('US5-Task20 fills Team 2\'s bar one third when 1 of 3 seats is taken', () => {
		render(<LobbyPage />);
		expect(barFill('b')).toBeCloseTo(33.33, 1);
	});

	it('US5-Task20 drains both bars toward VS during the countdown', () => {
		configureLobby(fullLobby('u1', 'u2', 'u3', 'u4', 'u5', 'u6'), { countdownSecondsRemaining: 3 });
		render(<LobbyPage />);
		const draining = Array.from(document.querySelectorAll('[data-team-bar]')).map((bar) => bar.getAttribute('data-draining'));
		expect(draining).toEqual(['true', 'true']);
	});

	it('gives each bar a track in the line color', () => {
		render(<LobbyPage />);
		expect(document.querySelector('[data-team-bar="a"]')?.parentElement?.classList.contains('bg-line')).toBe(true);
	});
});

describe('lobby seats', () => {
	it('US5-Task20 marks a ready player\'s row as ready', () => {
		configureLobby([ada, { ...grace, ready: true }, alan]);
		render(<LobbyPage />);
		expect(screen.getByText('Grace').closest('[data-ready]')?.getAttribute('data-ready')).toBe('true');
	});

	it('US5-Task20 does not mark a player who is not ready as ready', () => {
		render(<LobbyPage />);
		expect(screen.getByText('Alan').closest('[data-ready]')?.getAttribute('data-ready')).toBe('false');
	});

	it('US5-Task20 shows "You" in the user\'s own row', () => {
		render(<LobbyPage />);
		expect(screen.getByText('Ada').closest('[data-ready]')?.textContent).toContain('You');
	});
});

describe('lobby team choice through open seats', () => {
	it('US5-Task20 makes Team 1\'s open seat a "Join Team 1" button when the user has no team', () => {
		configureLobby([{ ...ada, team: null }, grace, alan]);
		render(<LobbyPage />);
		expect(screen.getAllByRole('button', { name: 'Join Team 1' }).length).toBeGreaterThan(0);
	});

	it('US5-Task20 sends join-team "a" when the user clicks "Join Team 1"', async () => {
		const user = userEvent.setup();
		configureLobby([{ ...ada, team: null }, grace, alan]);
		render(<LobbyPage />);
		await user.click(screen.getAllByRole('button', { name: 'Join Team 1' })[0]);
		expect(lobbyMocks.emit).toHaveBeenCalledWith('lobby:join-team', 'a');
	});

	it('US5-Task20 makes Team 1\'s open seat a "Switch to Team 1" button when the user is on Team 2', () => {
		configureLobby([{ ...ada, team: 'b' }, grace, alan]);
		render(<LobbyPage />);
		expect(screen.getAllByRole('button', { name: 'Switch to Team 1' }).length).toBeGreaterThan(0);
	});

	it('US5-Task20 does not make the user\'s own team\'s open seats buttons', () => {
		render(<LobbyPage />);
		expect(screen.queryByRole('button', { name: /Team 1/ })).toBeNull();
	});

	it('US5-Task20 stacks "Open seat" and "Join here" in the same spot on a seat the user can take', () => {
		configureLobby([{ ...ada, team: null }, grace, alan]);
		render(<LobbyPage />);
		const seat = screen.getAllByRole('button', { name: 'Join Team 1' })[0];
		// Both labels sit in one stacked cell (lb-seat-swap), so the hover swap crossfades in place.
		const cell = within(seat).getByText('Open seat').parentElement;
		expect(cell?.classList.contains('lb-seat-swap') && cell.contains(within(seat).getByText('Join here'))).toBe(true);
	});

	it('outlines an open seat the user can take in the muted color', () => {
		configureLobby([{ ...ada, team: null }, grace, alan]);
		render(<LobbyPage />);
		expect(screen.getAllByRole('button', { name: 'Join Team 1' })[0].classList.contains('border-muted/40')).toBe(true);
	});

	it('outlines an open seat on the user\'s own team in the muted color', () => {
		render(<LobbyPage />);
		expect(screen.getAllByText('Open seat')[0].classList.contains('border-muted/40')).toBe(true);
	});

	it('US5-Task20 no longer shows a "Your team" button', () => {
		render(<LobbyPage />);
		expect(screen.queryByRole('button', { name: 'Your team' })).toBeNull();
	});
});

describe('lobby display name in the user\'s row', () => {
	it('US5-Task20 has an "Edit your display name" button', () => {
		render(<LobbyPage />);
		expect(screen.getByRole('button', { name: 'Edit your display name' })).toBeTruthy();
	});

	it('US5-Task20 shows the "Display name" input after clicking "Edit your display name"', async () => {
		const user = userEvent.setup();
		render(<LobbyPage />);
		await user.click(screen.getByRole('button', { name: 'Edit your display name' }));
		expect(screen.getByLabelText('Display name')).toBeTruthy();
	});

	it('US5-Task20 sends the trimmed name when the user saves it', async () => {
		const user = userEvent.setup();
		render(<LobbyPage />);
		await user.click(screen.getByRole('button', { name: 'Edit your display name' }));
		fireEvent.change(screen.getByLabelText('Display name'), { target: { value: '  Lovelace  ' } });
		await user.click(screen.getByRole('button', { name: 'Save name' }));
		expect(lobbyMocks.emit).toHaveBeenCalledWith('lobby:set-name', 'Lovelace');
	});
});

describe('lobby top bar', () => {
	it('US5-Task20 puts the "Players per team" control in the top bar', () => {
		render(<LobbyPage />);
		expect(topBar().getByRole('group', { name: 'Players per team' })).toBeTruthy();
	});

	it('US5-Task20 puts "Leave lobby" in the top bar', () => {
		render(<LobbyPage />);
		expect(topBar().getByRole('button', { name: 'Leave lobby' })).toBeTruthy();
	});
});
