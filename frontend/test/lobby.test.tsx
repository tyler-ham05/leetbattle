import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const lobbyMocks = vi.hoisted(() => ({
	useAuth: vi.fn(),
	useLobbySocket: vi.fn(),
	emit: vi.fn(),
	connect: vi.fn(),
	clearError: vi.fn(),
}));

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }));
vi.mock('../app/login/context', () => ({ useAuth: () => lobbyMocks.useAuth() }));
vi.mock('../app/lobby/socket-context', () => ({
	useLobbySocket: () => lobbyMocks.useLobbySocket(),
}));

import LobbyPage from '../app/lobby/page';

const players = [
	{ userId: 'u1', displayName: 'Ada', team: 'a' as const, connected: true, ready: false },
	{ userId: 'u2', displayName: 'Grace', team: 'a' as const, connected: true, ready: false },
	{ userId: 'u3', displayName: 'Katherine', team: 'a' as const, connected: true, ready: false },
	{ userId: 'u4', displayName: 'Alan', team: 'b' as const, connected: true, ready: false },
	{ userId: 'u5', displayName: 'Edsger', team: 'b' as const, connected: true, ready: false },
	{ userId: 'u6', displayName: 'Margaret', team: 'b' as const, connected: true, ready: false },
];

function configureLobby(readyUserId?: string, canReady = true) {
	const currentPlayers = players.map((player) => ({ ...player, ready: player.userId === readyUserId }));
	lobbyMocks.useAuth.mockReturnValue({ user: { id: 'u1', name: 'Ada', email: 'ada@example.test' }, isLoading: false });
	lobbyMocks.useLobbySocket.mockReturnValue({
		socket: { connected: true, emit: lobbyMocks.emit },
		connected: true,
		lobby: {
			players: currentPlayers,
			playerCount: 6,
			readyCount: readyUserId ? 1 : 0,
			canReady,
			readyToStart: false,
			countdownSecondsRemaining: null,
		},
		error: null,
		matchReadiness: null,
		connect: lobbyMocks.connect,
		clearError: lobbyMocks.clearError,
	});
}

beforeEach(() => {
	vi.clearAllMocks();
	configureLobby();
});

afterEach(() => cleanup());

describe('lobby ready status', () => {
	it('US-1-T-1 shows player statuses and sends ready when the player clicks Ready up', async () => {
		const user = userEvent.setup();
		render(<LobbyPage />);

		expect(screen.getAllByText('Not ready')).toHaveLength(6);
		await user.click(screen.getByRole('button', { name: 'Ready up' }));

		expect(lobbyMocks.emit).toHaveBeenCalledWith('lobby:set-ready', true);
	});

	it('US-1-T-1 shows Ready and sends not-ready when the player clicks Unready', async () => {
		const user = userEvent.setup();
		const { rerender } = render(<LobbyPage />);
		configureLobby('u1');
		rerender(<LobbyPage />);

		expect(screen.getAllByText('Ready').length).toBe(1);
		await user.click(screen.getByRole('button', { name: 'Unready' }));

		expect(lobbyMocks.emit).toHaveBeenCalledWith('lobby:set-ready', false);
	});

	it('US-1-T-1 disables Ready up while the lobby is not eligible', () => {
		configureLobby(undefined, false);
		render(<LobbyPage />);

		expect((screen.getByRole('button', { name: 'Ready up' }) as HTMLButtonElement).disabled).toBe(true);
	});
});
