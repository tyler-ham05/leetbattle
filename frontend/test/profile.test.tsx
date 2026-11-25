// US-7-T-1 Profile page: league, rating, record and join date
// (AuthService's GET /me is mocked through the auth context; no test calls a backend service.)
//
// The profile page shows the signed-in player's stats (AC8)
//  - The profile page should show the player's name
//  - The profile page should show the player's league (e.g. "Silver II")
//  - The profile page should show the player's rating (e.g. "432")
//  - The profile page should show the player's number of wins
//  - The profile page should show the player's number of losses
//  - The profile page should show the player's number of draws
//  - The profile page should show the date the player joined
// Getting to the profile page
//  - The user menu should have a "Profile" link to /profile
//  - A signed-out visitor who opens /profile should be sent to /login
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fakeUser } from './helpers';

// The signed-in player as GET /me returns them, rating fields included.
const ratedUser = { ...fakeUser, rating: 432, league: 'Silver II', wins: 7, losses: 3, draws: 1 };

const mocks = vi.hoisted(() => ({
	user: null as unknown,
	replace: vi.fn(),
}));

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), replace: mocks.replace, back: vi.fn() }) }));
vi.mock('../app/login/context', () => ({
	useAuth: () => ({ user: mocks.user, isLoading: false, logout: vi.fn(), refresh: vi.fn() }),
}));

import ProfilePage from '../app/profile/page';
import UserMenu from '../app/_home/components/user-menu';

// The value next to a stat's label: the page lists its stats as <dt>label</dt><dd>value</dd>.
const valueOf = (label: string) => screen.getByText(label, { selector: 'dt' }).nextElementSibling?.textContent;

beforeEach(() => {
	vi.clearAllMocks();
	mocks.user = ratedUser;
});
afterEach(() => cleanup());

describe('US-7-T-1 the profile page shows the signed-in player\'s stats', () => {
	it('US-7-T-1 shows the player\'s name', () => {
		render(<ProfilePage />);
		expect(screen.getByRole('heading', { name: 'Ada' })).toBeTruthy();
	});

	it('US-7-T-1 shows the player\'s league', () => {
		render(<ProfilePage />);
		expect(valueOf('League')).toBe('Silver II');
	});

	it('US-7-T-1 shows the player\'s rating', () => {
		render(<ProfilePage />);
		expect(valueOf('Rating')).toBe('432');
	});

	it('US-7-T-1 shows the player\'s wins', () => {
		render(<ProfilePage />);
		expect(valueOf('Wins')).toBe('7');
	});

	it('US-7-T-1 shows the player\'s losses', () => {
		render(<ProfilePage />);
		expect(valueOf('Losses')).toBe('3');
	});

	it('US-7-T-1 shows the player\'s draws', () => {
		render(<ProfilePage />);
		expect(valueOf('Draws')).toBe('1');
	});

	// fakeUser joined at 2026-01-01T00:00:00Z.
	it('US-7-T-1 shows the date the player joined', () => {
		render(<ProfilePage />);
		expect(valueOf('Joined')).toBe('January 1, 2026');
	});
});

describe('US-7-T-1 getting to the profile page', () => {
	it('US-7-T-1 links to /profile from the user menu', async () => {
		render(<UserMenu />);
		await userEvent.click(screen.getByRole('button', { name: 'Account menu' }));
		expect(screen.getByRole('link', { name: 'Profile' }).getAttribute('href')).toBe('/profile');
	});

	it('US-7-T-1 sends a signed-out visitor to /login', () => {
		mocks.user = null;
		render(<ProfilePage />);
		expect(mocks.replace).toHaveBeenCalledWith('/login');
	});
});
