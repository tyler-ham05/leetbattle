// US-4-T-9: slide to ready, one-step join, seats that stay put. The cases are
// listed in lobby-slider-test-pseudo.md. UI only: auth and the lobby socket are
// mocked, so nothing here talks to LobbyService.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// `emit` records every event the page would have sent over the socket.
const lobbyMocks = vi.hoisted(() => ({
	useAuth: vi.fn(),
	useLobbySocket: vi.fn(),
	emit: vi.fn(),
}));

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }));
vi.mock('../app/login/context', () => ({ useAuth: () => lobbyMocks.useAuth() }));
vi.mock('../app/lobby/socket-context', () => ({ useLobbySocket: () => lobbyMocks.useLobbySocket() }));

import LobbyPage from '../app/lobby/page';

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
const full = [ada, grace, katherine, alan, edsger, margaret];

// Sets what useAuth and useLobbySocket return for the next render. canReady
// follows the real server: true only once all six seats are taken.
function configureLobby(players: ReturnType<typeof player>[] = full) {
	lobbyMocks.useAuth.mockReturnValue({ user: { id: 'u1', name: 'Ada', email: 'ada@example.test' }, isLoading: false });
	lobbyMocks.useLobbySocket.mockReturnValue({
		socket: { connected: true, emit: lobbyMocks.emit },
		connected: true,
		lobby: {
			players,
			playerCount: players.length,
			readyCount: players.filter((entry) => entry.ready).length,
			canReady: players.filter((entry) => entry.team).length === 6,
			readyToStart: false,
			countdownSecondsRemaining: null,
			teamSize: 3,
			hostId: 'u2',
		},
		error: null,
		matchReadiness: null,
		gameStarted: null,
		connect: vi.fn(),
		clearError: vi.fn(),
	});
}

// The slider track is 320px wide starting at x = 0, so the 48px handle (plus
// its 4px margins) travels from clientX 28 to clientX 292.
function slider() {
	const track = screen.getByRole('slider');
	track.getBoundingClientRect = () => ({ left: 0, top: 0, width: 320, height: 56, right: 320, bottom: 56, x: 0, y: 0, toJSON: () => ({}) });
	return track;
}

// Presses on the handle, moves to clientX, and (optionally) lets go.
function drag(track: HTMLElement, fromX: number, toX: number, release = true) {
	fireEvent.pointerDown(track, { pointerId: 1, clientX: fromX });
	fireEvent.pointerMove(track, { pointerId: 1, clientX: toX });
	if (release) fireEvent.pointerUp(track, { pointerId: 1, clientX: toX });
}

// Sends a trackpad wheel event that can be cancelled, like the browser does.
function swipe(track: HTMLElement, deltaX: number, deltaY = 0) {
	const event = new WheelEvent('wheel', { deltaX, deltaY, bubbles: true, cancelable: true });
	act(() => {
		track.dispatchEvent(event);
	});
	return event;
}

function readyEvents() {
	return lobbyMocks.emit.mock.calls.filter(([name]) => name === 'lobby:set-ready');
}

function joinTeamEvents() {
	return lobbyMocks.emit.mock.calls.filter(([name]) => name === 'lobby:join-team');
}

beforeEach(() => {
	lobbyMocks.emit.mockReset();
	configureLobby();
});

afterEach(() => {
	cleanup();
	vi.useRealTimers();
});

describe('slide to ready', () => {
	it('shows a "Slide to ready" slider once every seat is taken', () => {
		render(<LobbyPage />);
		// The accessible name stays the same while the visible label changes.
		expect(screen.getByRole('slider', { name: 'Slide to ready' })).toBeTruthy();
	});

	it('no longer shows a Ready up button', () => {
		render(<LobbyPage />);
		expect(screen.queryByRole('button', { name: 'Ready up' })).toBeNull();
	});

	it('tells screen readers "Not ready" for a player who is not ready', () => {
		render(<LobbyPage />);
		expect(slider().getAttribute('aria-valuetext')).toBe('Not ready');
	});

	it('tells screen readers "Ready" for a ready player', () => {
		configureLobby([{ ...ada, ready: true }, grace, katherine, alan, edsger, margaret]);
		render(<LobbyPage />);
		expect(slider().getAttribute('aria-valuetext')).toBe('Ready');
	});

	it('puts a ready player\'s slider at 100', () => {
		configureLobby([{ ...ada, ready: true }, grace, katherine, alan, edsger, margaret]);
		render(<LobbyPage />);
		expect(slider().getAttribute('aria-valuenow')).toBe('100');
	});

	it('readies the player as soon as the handle reaches the end, before letting go', () => {
		render(<LobbyPage />);
		// No pointerup: reaching the end is enough.
		drag(slider(), 28, 300, false);
		expect(lobbyMocks.emit).toHaveBeenCalledWith('lobby:set-ready', true);
	});

	it('unreadies a ready player when the handle is dragged back to the start', () => {
		configureLobby([{ ...ada, ready: true }, grace, katherine, alan, edsger, margaret]);
		render(<LobbyPage />);
		drag(slider(), 292, 0, false);
		expect(lobbyMocks.emit).toHaveBeenCalledWith('lobby:set-ready', false);
	});

	it('snaps the handle back to the start when let go partway', () => {
		render(<LobbyPage />);
		const track = slider();
		drag(track, 28, 150);
		expect(track.getAttribute('aria-valuenow')).toBe('0');
	});

	it('does not ready the player when let go partway', () => {
		render(<LobbyPage />);
		drag(slider(), 28, 150);
		expect(readyEvents()).toHaveLength(0);
	});

	it('does not ready the player on a plain click', async () => {
		const user = userEvent.setup();
		render(<LobbyPage />);
		await user.click(slider());
		expect(readyEvents()).toHaveLength(0);
	});

	it('readies the player on Space', () => {
		render(<LobbyPage />);
		fireEvent.keyDown(slider(), { key: ' ' });
		expect(lobbyMocks.emit).toHaveBeenCalledWith('lobby:set-ready', true);
	});

	it('unreadies a ready player on Enter', () => {
		configureLobby([{ ...ada, ready: true }, grace, katherine, alan, edsger, margaret]);
		render(<LobbyPage />);
		fireEvent.keyDown(slider(), { key: 'Enter' });
		expect(lobbyMocks.emit).toHaveBeenCalledWith('lobby:set-ready', false);
	});

	it('readies the player on Right arrow', () => {
		render(<LobbyPage />);
		fireEvent.keyDown(slider(), { key: 'ArrowRight' });
		expect(lobbyMocks.emit).toHaveBeenCalledWith('lobby:set-ready', true);
	});

	it('unreadies a ready player on Left arrow', () => {
		configureLobby([{ ...ada, ready: true }, grace, katherine, alan, edsger, margaret]);
		render(<LobbyPage />);
		fireEvent.keyDown(slider(), { key: 'ArrowLeft' });
		expect(lobbyMocks.emit).toHaveBeenCalledWith('lobby:set-ready', false);
	});

	it('marks the slider disabled until every seat is taken', () => {
		configureLobby([ada, grace, alan]);
		render(<LobbyPage />);
		expect(slider().getAttribute('aria-disabled')).toBe('true');
	});

	it('reads "Waiting for players" until every seat is taken', () => {
		configureLobby([ada, grace, alan]);
		render(<LobbyPage />);
		expect(slider().textContent).toContain('Waiting for players');
	});

	it('does not ready the player by dragging until every seat is taken', () => {
		configureLobby([ada, grace, alan]);
		render(<LobbyPage />);
		drag(slider(), 28, 300);
		expect(readyEvents()).toHaveLength(0);
	});
});

describe('two-finger swipe over the slider', () => {
	it('swallows a sideways swipe so the browser does not go back a page', () => {
		render(<LobbyPage />);
		expect(swipe(slider(), 40).defaultPrevented).toBe(true);
	});

	it('readies the player when the fingers swipe right (natural scrolling gives a negative deltaX)', () => {
		render(<LobbyPage />);
		swipe(slider(), -400);
		expect(lobbyMocks.emit).toHaveBeenCalledWith('lobby:set-ready', true);
	});

	it('ignores a mostly vertical swipe', () => {
		render(<LobbyPage />);
		const track = slider();
		swipe(track, -60, 200);
		expect(track.getAttribute('aria-valuenow')).toBe('0');
	});

	it('snaps a short swipe back to the start once the fingers stop', () => {
		vi.useFakeTimers();
		render(<LobbyPage />);
		const track = slider();
		swipe(track, -100);
		act(() => {
			vi.advanceTimersByTime(250);
		});
		expect(track.getAttribute('aria-valuenow')).toBe('0');
	});

	it('turns off horizontal overscroll while the lobby is shown', () => {
		render(<LobbyPage />);
		expect(document.documentElement.style.overscrollBehaviorX).toBe('none');
	});
});

describe('one-step join', () => {
	beforeEach(() => configureLobby([grace, alan]));

	it('says "Pick a seat to join" before the user joins', () => {
		render(<LobbyPage />);
		expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Pick a seat to join');
	});

	it('always shows "Join here" on an open seat (not hover-only: the old hidden hint class is gone)', () => {
		render(<LobbyPage />);
		const seat = screen.getAllByRole('button', { name: 'Join Team 2' })[0];
		expect(within(seat).getByText('Join here').classList.contains('lb-seat-hint')).toBe(false);
	});

	it('sends a join event when an open seat is clicked before joining', async () => {
		const user = userEvent.setup();
		render(<LobbyPage />);
		await user.click(screen.getAllByRole('button', { name: 'Join Team 2' })[0]);
		expect(lobbyMocks.emit).toHaveBeenCalledWith('lobby:join', undefined);
	});

	it('takes the clicked seat once the join lands', async () => {
		const user = userEvent.setup();
		const { rerender } = render(<LobbyPage />);
		await user.click(screen.getAllByRole('button', { name: 'Join Team 2' })[0]);
		// The server answers with a lobby state where Ada is in but has no team.
		configureLobby([{ ...ada, team: null }, grace, alan]);
		rerender(<LobbyPage />);
		expect(joinTeamEvents()).toEqual([['lobby:join-team', 'b']]);
	});

	it('names the big button "Quick join"', () => {
		render(<LobbyPage />);
		expect(screen.getByRole('button', { name: 'Quick join' })).toBeTruthy();
	});

	it('sends a join event on Quick join', async () => {
		const user = userEvent.setup();
		render(<LobbyPage />);
		await user.click(screen.getByRole('button', { name: 'Quick join' }));
		expect(lobbyMocks.emit).toHaveBeenCalledWith('lobby:join', undefined);
	});

	it('seats a quick join on the emptier team', async () => {
		const user = userEvent.setup();
		configureLobby([grace, katherine, alan]);
		const { rerender } = render(<LobbyPage />);
		await user.click(screen.getByRole('button', { name: 'Quick join' }));
		configureLobby([{ ...ada, team: null }, grace, katherine, alan]);
		rerender(<LobbyPage />);
		expect(joinTeamEvents()).toEqual([['lobby:join-team', 'b']]);
	});

	it('seats a quick join on Team 1 when the teams are even', async () => {
		const user = userEvent.setup();
		const { rerender } = render(<LobbyPage />);
		await user.click(screen.getByRole('button', { name: 'Quick join' }));
		configureLobby([{ ...ada, team: null }, grace, alan]);
		rerender(<LobbyPage />);
		expect(joinTeamEvents()).toEqual([['lobby:join-team', 'a']]);
	});
});

describe('seats stay put', () => {
	beforeEach(() => configureLobby([{ ...ada, team: 'b' }, grace, alan]));

	it('keeps Team 2 on the right for a user on Team 2, so "Your team" is the second heading', () => {
		render(<LobbyPage />);
		const names = screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent);
		expect(names).toEqual(['Rival team', 'Your team']);
	});

	it('colors "Your team" primary on the right side', () => {
		render(<LobbyPage />);
		expect(screen.getByRole('heading', { name: 'Your team' }).classList.contains('text-primary')).toBe(true);
	});

	it('colors "Rival team" secondary on the left side', () => {
		render(<LobbyPage />);
		expect(screen.getByRole('heading', { name: 'Rival team' }).classList.contains('text-secondary')).toBe(true);
	});

	it('fills the user\'s own Team 2 bar in the primary color', () => {
		render(<LobbyPage />);
		expect(document.querySelector('[data-team-bar="b"]')?.classList.contains('bg-primary')).toBe(true);
	});

	it('always shows "Switch here" on the other team\'s open seat', () => {
		render(<LobbyPage />);
		const seat = screen.getAllByRole('button', { name: 'Switch to rival team' })[0];
		expect(within(seat).getByText('Switch here').classList.contains('lb-seat-hint')).toBe(false);
	});

	it('shows only "Open seat" on the user\'s own team\'s open seat', () => {
		render(<LobbyPage />);
		const ownTeam = screen.getByRole('list', { name: 'Your team players' });
		expect(within(ownTeam).queryByText('Switch here')).toBeNull();
	});

	it('brings the user\'s row in from the other side after switching teams', () => {
		const { rerender } = render(<LobbyPage />);
		configureLobby([{ ...ada, team: 'a' }, grace, alan]);
		rerender(<LobbyPage />);
		// Now on the left, the row enters from the right (across VS).
		// Look only in the user's team list: the top bar also shows the
		// signed-in user's name (US-4-T-10), so "Ada" appears twice on the page.
		const ownTeam = screen.getByRole('list', { name: 'Your team players' });
		expect(within(ownTeam).getByText('Ada').closest('li')?.classList.contains('lb-cross-a')).toBe(true);
	});
});

// A short line under the slider tells players how to use it, including the
// two-finger swipe, which they might not guess.
describe('hint under the slider', () => {
	it('says how to ready up before the player is ready', () => {
		configureLobby();
		render(<LobbyPage />);
		expect(screen.queryByText('Drag, or swipe with two fingers')).not.toBeNull();
	});

	it('says how to unready once the player is ready', () => {
		configureLobby([player('u1', 'Ada', 'a', true), grace, katherine, alan, edsger, margaret]);
		render(<LobbyPage />);
		expect(screen.queryByText('Slide back to unready')).not.toBeNull();
	});

	it('shows no hint while waiting for players', () => {
		configureLobby([ada, alan]);
		render(<LobbyPage />);
		expect(screen.queryByText('Drag, or swipe with two fingers')).toBeNull();
	});
});
