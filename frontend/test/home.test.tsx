// Home screen should display user profile
//  - User profile should have a dropdown when clicked that allows user to
//      - Change settings
//      - Log out
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fakeUser } from './helpers';

const push = vi.fn();
const logout = vi.fn();

vi.mock('next/navigation', () => ({ useRouter: () => ({ push, replace: vi.fn() }) }));
vi.mock('../app/login/context', () => ({
	useAuth: () => ({ user: fakeUser, logout, isLoading: false }),
}));

import HomeTopBar from '../app/_home/components/topbar';

beforeEach(() => {
	vi.clearAllMocks();
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
});
