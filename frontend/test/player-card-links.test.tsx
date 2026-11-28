// US-7-T-5: opening a player's profile from the lobby and the result screen (AC10).
// Pseudocode: test/player-card-test-pseudo.md, "Opening a profile".
// The lobby's auth and socket contexts are fakes, so nothing reaches a service.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

const mocks = vi.hoisted(() => ({ useLobbySocket: vi.fn() }));

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }));
vi.mock('../app/login/context', () => ({
	useAuth: () => ({ user: { id: 'u1', name: 'Ada', email: 'ada@example.test' }, isLoading: false }),
}));
vi.mock('../app/lobby/socket-context', () => ({ useLobbySocket: () => mocks.useLobbySocket() }));

import LobbyPage from '../app/lobby/page';
import ResultScreen from '../app/game/components/result-screen';

afterEach(() => cleanup());

describe('US-7-T-5 opening a profile (AC10)', () => {
	// Ada (u1, the viewer) and Grace (u2) on Team 1 of a 1v1-sized lobby.
	it('US-7-T-5 links a lobby player\'s name to their profile', () => {
		const players = [
			{ userId: 'u1', displayName: 'Ada', team: 'a', connected: true, ready: false },
			{ userId: 'u2', displayName: 'Grace', team: 'b', connected: true, ready: false },
		];
		mocks.useLobbySocket.mockReturnValue({
			socket: { connected: true, emit: vi.fn() },
			connected: true,
			lobby: { players, playerCount: 2, readyCount: 0, canReady: true, readyToStart: false, countdownSecondsRemaining: null, teamSize: 1, hostId: 'u1' },
			error: null, matchReadiness: null, gameStarted: null, connect: vi.fn(), clearError: vi.fn(),
		});
		render(<LobbyPage />);
		expect(screen.getByRole('link', { name: 'Grace' }).getAttribute('href')).toBe('/profile/u2');
	});

	it('US-7-T-5 links a result screen player\'s name to their profile', () => {
		render(
			<ResultScreen
				result={{ winner: 'a', reason: 'solved' }}
				myTeam="a"
				scores={{ a: 150, b: 0 }}
				players={[{ userId: 'u7', displayName: 'Ada', team: 'a', connected: true, left: false }]}
				pool={[]}
				solved={{ a: [], b: [] }}
			/>,
		);
		expect(screen.getByRole('link', { name: 'Ada' }).getAttribute('href')).toBe('/profile/u7');
	});
});
