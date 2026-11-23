import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Shared mocks. The lobby page never talks to LobbyService in these tests:
// the auth context and the lobby socket context are both replaced with fakes,
// and `emit` records what the page would have sent over the socket.
const lobbyMocks = vi.hoisted(() => ({
	useAuth: vi.fn(),
	useLobbySocket: vi.fn(),
	emit: vi.fn(),
	connect: vi.fn(),
	clearError: vi.fn(),
	// Where the page navigates once the match starts.
	push: vi.fn(),
}));

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: lobbyMocks.push, replace: vi.fn() }) }));
vi.mock('../app/login/context', () => ({ useAuth: () => lobbyMocks.useAuth() }));
vi.mock('../app/lobby/socket-context', () => ({
	useLobbySocket: () => lobbyMocks.useLobbySocket(),
}));

import LobbyPage from '../app/lobby/page';
import { LOADER_MS } from '../app/_shared/page-loader';

type TeamId = 'a' | 'b';

interface TestPlayer {
	userId: string;
	displayName: string;
	team: TeamId | null;
	connected: boolean;
	ready: boolean;
}

// Builds a connected, not-ready player. Tests override only the fields they care about.
function player(userId: string, displayName: string, team: TeamId | null, overrides: Partial<TestPlayer> = {}): TestPlayer {
	return { userId, displayName, team, connected: true, ready: false, ...overrides };
}

// Default roster: two full teams of three, with the signed-in user (u1, "Ada") on Team 1.
const fullTeams: TestPlayer[] = [
	player('u1', 'Ada', 'a'),
	player('u2', 'Grace', 'a'),
	player('u3', 'Katherine', 'a'),
	player('u4', 'Alan', 'b'),
	player('u5', 'Edsger', 'b'),
	player('u6', 'Margaret', 'b'),
];

// Returns the default roster with a different team for each listed user.
function withTeams(teams: Record<string, TeamId | null>): TestPlayer[] {
	return fullTeams.map((entry) => (entry.userId in teams ? { ...entry, team: teams[entry.userId] } : entry));
}

// Returns the default roster with the listed users marked ready.
function withReady(...userIds: string[]): TestPlayer[] {
	return fullTeams.map((entry) => ({ ...entry, ready: userIds.includes(entry.userId) }));
}

interface LobbyOptions {
	userId?: string;
	players?: TestPlayer[];
	lobby?: Record<string, unknown>;
	context?: Record<string, unknown>;
}

// Sets what useAuth and useLobbySocket return for the next render.
// - userId:  the signed-in user (defaults to u1)
// - players: the lobby roster (playerCount and readyCount are derived from it)
// - lobby:   overrides for lobby state fields such as canReady or countdownSecondsRemaining
// - context: overrides for socket context fields such as connected, error or matchReadiness
function configureLobby({ userId = 'u1', players = fullTeams, lobby = {}, context = {} }: LobbyOptions = {}) {
	lobbyMocks.useAuth.mockReturnValue({ user: { id: userId, name: 'Ada', email: 'ada@example.test' }, isLoading: false });
	lobbyMocks.useLobbySocket.mockReturnValue({
		socket: { connected: true, emit: lobbyMocks.emit },
		connected: true,
		lobby: {
			players,
			playerCount: players.length,
			readyCount: players.filter((entry) => entry.ready).length,
			canReady: true,
			readyToStart: false,
			countdownSecondsRemaining: null,
			// Three per team, hosted by u1, unless a test picks otherwise.
			teamSize: 3,
			hostId: 'u1',
			...lobby,
		},
		error: null,
		matchReadiness: null,
		gameStarted: null,
		connect: lobbyMocks.connect,
		clearError: lobbyMocks.clearError,
		...context,
	});
}

beforeEach(() => {
	vi.clearAllMocks();
	configureLobby();
});

afterEach(() => cleanup());

describe('lobby ready status', () => {
	it('US-1-T-1 shows "Not ready" for all six players when nobody is ready', () => {
		render(<LobbyPage />);

		// Every player row shows the not-ready label.
		expect(screen.getAllByText('Not ready')).toHaveLength(6);
	});

	it('US-1-T-1 shows "Ready" for a player who is ready', () => {
		configureLobby({ players: withReady('u1') });
		render(<LobbyPage />);

		// Only u1 is ready, so exactly one row shows the "Ready" label.
		expect(screen.getAllByText('Ready')).toHaveLength(1);
	});
});

describe('lobby ready toggle', () => {
	it('US-1-T-1 sends a ready event when the player clicks Ready up', async () => {
		const user = userEvent.setup();
		render(<LobbyPage />);

		await user.click(screen.getByRole('button', { name: 'Ready up' }));

		// The page asks the server to mark the player ready.
		expect(lobbyMocks.emit).toHaveBeenCalledWith('lobby:set-ready', true);
	});

	it('US-1-T-1 sends a not-ready event when the player clicks Unready', async () => {
		const user = userEvent.setup();
		configureLobby({ players: withReady('u1') });
		render(<LobbyPage />);

		await user.click(screen.getByRole('button', { name: 'Unready' }));

		// The page asks the server to mark the player not ready.
		expect(lobbyMocks.emit).toHaveBeenCalledWith('lobby:set-ready', false);
	});

	it('US-1-T-1 disables Ready up while the lobby is not eligible', () => {
		configureLobby({ lobby: { canReady: false } });
		render(<LobbyPage />);

		// The server reports that readying up is not allowed yet, so the button is disabled.
		expect((screen.getByRole('button', { name: 'Ready up' }) as HTMLButtonElement).disabled).toBe(true);
	});
});

describe('lobby countdown and readiness summary', () => {
	it('US-1-T-1 shows the remaining countdown seconds', () => {
		configureLobby({ lobby: { countdownSecondsRemaining: 3 } });
		render(<LobbyPage />);

		// A running countdown takes priority over the ready summary.
		expect(screen.getByText('Starting match in 3…')).toBeTruthy();
	});

	it('US-6-T-2 navigates to the game page once the game has started', () => {
		vi.useFakeTimers();
		configureLobby({ context: { matchReadiness: { lobbyId: 'main', players: fullTeams }, gameStarted: { gameId: 'game-1' } } });
		render(<LobbyPage />);
		// US5-Task20: the team clash plays first, then the page moves on.
		act(() => {
			vi.advanceTimersByTime(LOADER_MS.clash);
		});
		vi.useRealTimers();

		// After lobby:game-started, the page hands the player over to /game/<gameId>.
		expect(lobbyMocks.push).toHaveBeenCalledWith('/game/game-1');
	});

	it('US-6-T-2 shows "Joining match…" while GameService creates the game', () => {
		// The countdown has finished (ready-for-match) but the gameId hasn't arrived yet.
		configureLobby({ context: { matchReadiness: { lobbyId: 'main', players: fullTeams } } });
		render(<LobbyPage />);

		expect(screen.getByText('Joining match…')).toBeTruthy();
	});
});

describe('lobby for players who have not joined', () => {
	// Five players in the lobby, and the signed-in user (u7) is not one of them.
	const openLobby = { userId: 'u7', players: fullTeams.slice(0, 5) };

	it('shows a Join lobby button when the user is not in the lobby', () => {
		configureLobby(openLobby);
		render(<LobbyPage />);

		// The user is not in the roster, so they are offered a way to join.
		expect(screen.getByRole('button', { name: 'Join lobby' })).toBeTruthy();
	});

	it('sends a join event when the user clicks Join lobby', async () => {
		const user = userEvent.setup();
		configureLobby(openLobby);
		render(<LobbyPage />);

		await user.click(screen.getByRole('button', { name: 'Join lobby' }));

		// The page asks the server for a seat (the join event has no payload).
		expect(lobbyMocks.emit).toHaveBeenCalledWith('lobby:join', undefined);
	});

	it('tells the user when the lobby is full', () => {
		configureLobby({ userId: 'u7' });
		render(<LobbyPage />);

		// All six seats are taken by other players.
		expect(screen.getByText('This lobby is full')).toBeTruthy();
	});

	it('disables Join lobby when the lobby is full', () => {
		configureLobby({ userId: 'u7' });
		render(<LobbyPage />);

		// A seventh player cannot try to join.
		expect((screen.getByRole('button', { name: 'Join lobby' }) as HTMLButtonElement).disabled).toBe(true);
	});
});

describe('lobby connection state', () => {
	it('shows a connecting message while the socket is not connected', () => {
		configureLobby({ context: { connected: false } });
		render(<LobbyPage />);

		// Until the socket connects, the page says it is still connecting.
		expect(screen.getByText('Connecting to lobby…')).toBeTruthy();
	});

	it('US-1-T-1 shows Reconnecting for a disconnected player', () => {
		configureLobby({ players: fullTeams.map((entry) => (entry.userId === 'u4' ? { ...entry, connected: false } : entry)) });
		render(<LobbyPage />);

		// A player inside the reconnect grace period shows a reconnecting status, not a ready status.
		expect(screen.getByText('Reconnecting…')).toBeTruthy();
	});
});

describe('lobby team selection', () => {
	it('offers Join Team 1 when the user has no team', () => {
		configureLobby({ players: withTeams({ u1: null }) });
		render(<LobbyPage />);

		// Team 1 has two players, so the user can join it.
		expect(screen.getByRole('button', { name: 'Join Team 1' })).toBeTruthy();
	});

	it('sends a join-team event for team "a" when the user clicks Join Team 1', async () => {
		const user = userEvent.setup();
		configureLobby({ players: withTeams({ u1: null }) });
		render(<LobbyPage />);

		await user.click(screen.getByRole('button', { name: 'Join Team 1' }));

		// Team 1 is sent to the server as "a".
		expect(lobbyMocks.emit).toHaveBeenCalledWith('lobby:join-team', 'a');
	});

	it('offers Switch to rival team when the user is on Team 2 and Team 1 has space', () => {
		// u1 moves to Team 2 and u5/u6 have no team, so each team has two players.
		configureLobby({ players: withTeams({ u1: 'b', u5: null, u6: null }) });
		render(<LobbyPage />);

		expect(screen.getByRole('button', { name: 'Switch to rival team' })).toBeTruthy();
	});

	// US5-Task19 bug fix: in a 1v1 the user's own team is always full, which
	// used to flip Team 1's button to "Other team is full" despite its open seat.
	it('US5-Task19 offers Switch to rival team in a 1v1 when the user is on Team 2 and Team 1 is empty', () => {
		configureLobby({ players: [player('u1', 'Ada', 'b')], lobby: { teamSize: 1 } });
		render(<LobbyPage />);

		expect(screen.getByRole('button', { name: 'Switch to rival team' })).toBeTruthy();
	});
});

// The host should be able to choose the number of players per team
//  - The host should see a "Players per team" control with 1v1, 2v2 and 3v3 options
//  - Clicking "2v2" should send a set-team-size event with 2
//  - A player who is not the host should not see the team size options
//  - With a team size of 2 and 2 players ready, the status should display "2/4 players ready"
//  - With a team size of 1 and 2 players in the lobby, "This lobby is full" should be displayed to a player who has not joined
describe('lobby team size', () => {
	it('shows the host a "Players per team" control with 1v1, 2v2 and 3v3', () => {
		render(<LobbyPage />);

		const control = screen.getByRole('group', { name: 'Players per team' });
		expect(within(control).getAllByRole('button').map((button) => button.textContent)).toEqual(['1v1', '2v2', '3v3']);
	});

	it('sends a set-team-size event when the host picks 2v2', async () => {
		const user = userEvent.setup();
		render(<LobbyPage />);

		await user.click(screen.getByRole('button', { name: '2v2' }));

		expect(lobbyMocks.emit).toHaveBeenCalledWith('lobby:set-team-size', 2);
	});

	it('hides the team size options from a player who is not the host', () => {
		configureLobby({ lobby: { hostId: 'u2' } });
		render(<LobbyPage />);

		expect(screen.queryByRole('button', { name: '2v2' })).toBeNull();
	});

	it('tells a player who has not joined that a full 1v1 lobby is full', () => {
		configureLobby({ userId: 'u7', players: [player('u1', 'Ada', 'a'), player('u4', 'Alan', 'b')], lobby: { teamSize: 1 } });
		render(<LobbyPage />);

		expect(screen.getByText('This lobby is full')).toBeTruthy();
	});
});

describe('lobby display name', () => {
	it('disables Save name when the input matches the current name', async () => {
		const user = userEvent.setup();
		render(<LobbyPage />);
		// US5-Task20: the name is edited in the user's own row.
		await user.click(screen.getByRole('button', { name: 'Edit your display name' }));

		fireEvent.change(screen.getByLabelText('Display name'), { target: { value: 'Ada' } });

		// Saving the same name would not change anything.
		expect((screen.getByRole('button', { name: 'Save name' }) as HTMLButtonElement).disabled).toBe(true);
	});
});

describe('leaving the lobby', () => {
	it('sends a leave event when the user clicks Leave lobby', async () => {
		const user = userEvent.setup();
		render(<LobbyPage />);

		await user.click(screen.getByRole('button', { name: 'Leave lobby' }));

		// The page asks the server to release the user's seat (the leave event has no payload).
		expect(lobbyMocks.emit).toHaveBeenCalledWith('lobby:leave', undefined);
	});
});

// US5-Task20 replaced the seat markers with the team bars (lobby-arena.test.tsx).
describe('lobby seats and team colours', () => {
	it('shows one open seat when Team 1 has two players', () => {
		configureLobby({ players: withTeams({ u1: null }) });
		render(<LobbyPage />);

		// Team 1 has two of its three seats taken; Team 2 is full.
		expect(screen.getAllByText('Open seat')).toHaveLength(1);
	});

	it('colours the user\'s own Team 1 heading ("Your team") with the primary colour', () => {
		render(<LobbyPage />);

		expect(screen.getByRole('heading', { name: 'Your team' }).className).toContain('text-primary');
	});

	it('colours the other Team 2 heading ("Rival team") with the secondary colour', () => {
		render(<LobbyPage />);

		expect(screen.getByRole('heading', { name: 'Rival team' }).className).toContain('text-secondary');
	});

	it('does not put a coloured top border on the team boxes', () => {
		const { container } = render(<LobbyPage />);

		// The accent stripe along the top of each team box was removed.
		expect(container.querySelectorAll('[class*="border-t-"]')).toHaveLength(0);
	});

	it('shows the seconds left as a large number while the countdown runs', () => {
		configureLobby({ lobby: { countdownSecondsRemaining: 3 } });
		render(<LobbyPage />);

		// The number is shown on its own, next to the "Starting match in" label.
		expect(screen.getByText('3')).toBeTruthy();
	});
});
