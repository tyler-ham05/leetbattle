// Home screen should display user profile
//  - User profile should have a dropdown when clicked that allows user to
//      - Change settings
//      - Log out
//  - Clicking the settings link closes the dropdown
//  - Nothing is rendered when there's no logged-in user (!user)
//  - Falls back to showing the email when user.name is null
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fakeUser } from './helpers';

const push = vi.fn();
const logout = vi.fn();
// A mock we can redirect per-test (e.g. to simulate the logged-out/!user case)
// instead of the fixed fakeUser every test used to get.
const useAuthMock = vi.fn();

vi.mock('next/navigation', () => ({ useRouter: () => ({ push, replace: vi.fn() }) }));
vi.mock('../app/login/context', () => ({
	useAuth: () => useAuthMock(),
}));

import HomeTopBar from '../app/_home/components/topbar';

beforeEach(() => {
	vi.clearAllMocks();
	useAuthMock.mockReturnValue({ user: fakeUser, logout, isLoading: false });
});
afterEach(() => {
	cleanup();
});

describe('home screen user profile', () => {
	it('displays the profile button but keeps the dropdown closed initially', () => {
		render(<HomeTopBar />);
		expect(screen.getByRole('button', { name: 'Account menu' })).toBeTruthy();
		expect(screen.queryByText('Settings')).toBeNull();
		expect(screen.queryByText('Log out')).toBeNull();
	});

	it('opens a dropdown with the user\'s name, Settings and Log out when clicked', async () => {
		render(<HomeTopBar />);
		await userEvent.click(screen.getByRole('button', { name: 'Account menu' }));
		expect(screen.getByText('Ada')).toBeTruthy();
		expect(screen.getByText('Settings')).toBeTruthy();
		expect(screen.getByText('Log out')).toBeTruthy();
	});

	it('closes the dropdown when clicking outside of it', async () => {
		render(<HomeTopBar />);
		await userEvent.click(screen.getByRole('button', { name: 'Account menu' }));
		await userEvent.click(document.body);
		expect(screen.queryByText('Settings')).toBeNull();
	});

	it('links Settings to the settings page', async () => {
		render(<HomeTopBar />);
		await userEvent.click(screen.getByRole('button', { name: 'Account menu' }));
		expect(screen.getByRole('link', { name: 'Settings' }).getAttribute('href')).toBe('/settings');
	});

	it('logs the user out and returns to the root page', async () => {
		logout.mockResolvedValue(undefined);
		render(<HomeTopBar />);
		await userEvent.click(screen.getByRole('button', { name: 'Account menu' }));
		await userEvent.click(screen.getByRole('button', { name: 'Log out' }));

		await waitFor(() => expect(logout).toHaveBeenCalledTimes(1));
		expect(push).toHaveBeenCalledWith('/');
	});

	it('closes the dropdown when the Settings link is clicked', async () => {
		render(<HomeTopBar />);
		await userEvent.click(screen.getByRole('button', { name: 'Account menu' }));
		await userEvent.click(screen.getByRole('link', { name: 'Settings' }));
		expect(screen.queryByText('Settings')).toBeNull();
	});

	it('hides the account menu button when there is no logged-in user', () => {
		useAuthMock.mockReturnValue({ user: null, logout, isLoading: false });
		render(<HomeTopBar />);
		expect(screen.queryByRole('button', { name: 'Account menu' })).toBeNull();
	});

	it('renders no menu wrapper at all when there is no logged-in user', () => {
		useAuthMock.mockReturnValue({ user: null, logout, isLoading: false });
		// UserMenu bails out to `null`; only the topbar's own wordmark/link remain.
		const { container } = render(<HomeTopBar />);
		expect(container.querySelector('.relative')).toBeNull();
	});

	it('shows the email instead of a name when user.name is null', async () => {
		useAuthMock.mockReturnValue({ user: { ...fakeUser, name: null }, logout, isLoading: false });
		render(<HomeTopBar />);
		await userEvent.click(screen.getByRole('button', { name: 'Account menu' }));
		expect(screen.getByText(fakeUser.email)).toBeTruthy();
	});

	it('does not fall back to the (absent) name when user.name is null', async () => {
		useAuthMock.mockReturnValue({ user: { ...fakeUser, name: null }, logout, isLoading: false });
		render(<HomeTopBar />);
		await userEvent.click(screen.getByRole('button', { name: 'Account menu' }));
		expect(screen.queryByText(fakeUser.name as string)).toBeNull();
	});
});
