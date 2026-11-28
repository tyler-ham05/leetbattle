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
//  - Opening the profile page should reload the player's data from GET /me, so a rating changed by a match since the app loaded is shown
// Getting to the profile page
//  - The user menu should have a "Profile" link to /profile
//  - A signed-out visitor who opens /profile should be sent to /login
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fakeUser } from './helpers';

// The signed-in player as GET /me returns them, rating fields included.
const ratedUser = { ...fakeUser, rating: 432, league: 'Silver II', wins: 7, losses: 3, draws: 1 };

const mocks = vi.hoisted(() => ({
	user: null as unknown,
	replace: vi.fn(),
	refresh: vi.fn(),
}));

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), replace: mocks.replace, back: vi.fn() }) }));
vi.mock('../app/login/context', () => ({
	useAuth: () => ({ user: mocks.user, isLoading: false, logout: vi.fn(), refresh: mocks.refresh }),
}));

import ProfilePage from '../app/profile/page';
import UserMenu from '../app/_home/components/user-menu';

// US-7-T-5: the stats are now boxes (role group, named by their label) whose
// numbers count up, so these tests let the count finish on a fake clock first.
function statOf(label: string) {
	vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame', 'cancelAnimationFrame', 'performance'] });
	render(<ProfilePage />);
	act(() => {
		vi.advanceTimersByTime(4000);
	});
	return screen.getByRole('group', { name: label }).querySelector('.lb-pc-num')?.textContent;
}

beforeEach(() => {
	vi.clearAllMocks();
	mocks.user = ratedUser;
});
afterEach(() => {
	cleanup();
	vi.useRealTimers();
});

describe('US-7-T-1 the profile page shows the signed-in player\'s stats', () => {
	it('US-7-T-1 shows the player\'s name', () => {
		render(<ProfilePage />);
		expect(screen.getByRole('heading', { name: 'Ada' })).toBeTruthy();
	});

	it('US-7-T-1 shows the player\'s league', () => {
		// US-7-T-5: the league is on the player card.
		render(<ProfilePage />);
		expect(within(screen.getByRole('article', { name: 'Player card' })).getByText('Silver II')).toBeTruthy();
	});

	it('US-7-T-1 shows the player\'s rating', () => {
		// US-7-T-5: the visible rating is an odometer; screen readers get it as text.
		render(<ProfilePage />);
		expect(screen.getByText('Rating 432')).toBeTruthy();
	});

	it('US-7-T-1 shows the player\'s wins', () => {
		expect(statOf('Wins')).toBe('7');
	});

	it('US-7-T-1 shows the player\'s losses', () => {
		expect(statOf('Losses')).toBe('3');
	});

	it('US-7-T-1 shows the player\'s draws', () => {
		expect(statOf('Draws')).toBe('1');
	});

	// The signed-in user is loaded once when the app opens; a match played since
	// then changed the rating, so the page asks for the latest GET /me.
	it('US-7-T-1 reloads the player\'s data from GET /me when the profile page opens', () => {
		render(<ProfilePage />);
		expect(mocks.refresh).toHaveBeenCalledTimes(1);
	});

	// fakeUser joined at 2026-01-01T00:00:00Z. US-7-T-5: shown as month and year.
	it('US-7-T-1 shows the date the player joined', () => {
		render(<ProfilePage />);
		expect(screen.getByText('Joined January 2026')).toBeTruthy();
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
