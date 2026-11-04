// settings page should allow user to change their username
// settings page should allow user to change their password
// - user should not be able to change their password if they do not remember their password
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fakeUser, jsonResponse, requestsOf, stubFetch } from './helpers';

const refresh = vi.fn();

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }));
vi.mock('../app/login/context', () => ({
	useAuth: () => ({ user: fakeUser, isLoading: false, refresh }),
}));

import SettingsPage from '../app/settings/page';

beforeEach(() => {
	vi.clearAllMocks();
	vi.unstubAllGlobals();
	localStorage.clear();
	localStorage.setItem('authToken', 'tok123');
});
afterEach(() => {
	cleanup();
});

describe('changing username', () => {
	it('prefills the current name', () => {
		render(<SettingsPage />);
		expect((screen.getByLabelText('Name') as HTMLInputElement).value).toBe('Ada');
	});

	it('sends the new name with the auth token, refreshes the session and confirms', async () => {
		const fetchMock = stubFetch(() => jsonResponse({ user: { ...fakeUser, name: 'Grace' } }));
		render(<SettingsPage />);
		const name = screen.getByLabelText('Name');
		await userEvent.clear(name);
		await userEvent.type(name, 'Grace');
		await userEvent.click(screen.getByRole('button', { name: 'Save name' }));

		expect(await screen.findByText('Name updated.')).toBeTruthy();
		const [request] = requestsOf(fetchMock);
		expect(request.url).toMatch(/\/account$/);
		expect(request.method).toBe('PATCH');
		expect(request.headers.Authorization).toBe('Bearer tok123');
		expect(request.body).toEqual({ name: 'Grace' });
		expect(refresh).toHaveBeenCalled();
	});

	it('shows the server error when the update fails', async () => {
		stubFetch(() => jsonResponse({ error: 'Name too long' }, 400));
		render(<SettingsPage />);
		await userEvent.click(screen.getByRole('button', { name: 'Save name' }));
		expect(await screen.findByText('Name too long')).toBeTruthy();
	});
});

describe('changing password', () => {
	it('sends current and new password, confirms, and clears the fields', async () => {
		const fetchMock = stubFetch(() => jsonResponse({}));
		render(<SettingsPage />);
		await userEvent.type(screen.getByLabelText('Current password'), 'old-password');
		await userEvent.type(screen.getByLabelText('New password'), 'new-password-1');
		await userEvent.click(screen.getByRole('button', { name: 'Change password' }));

		expect(await screen.findByText('Password changed.')).toBeTruthy();
		const [request] = requestsOf(fetchMock);
		expect(request.url).toMatch(/\/password$/);
		expect(request.body).toEqual({
			currentPassword: 'old-password',
			newPassword: 'new-password-1',
		});
		expect((screen.getByLabelText('Current password') as HTMLInputElement).value).toBe('');
		expect((screen.getByLabelText('New password') as HTMLInputElement).value).toBe('');
	});

	it('does not call the API when the current password is left blank (user forgot it)', async () => {
		const fetchMock = stubFetch(() => jsonResponse({}));
		render(<SettingsPage />);
		await userEvent.type(screen.getByLabelText('New password'), 'new-password-1');
		await userEvent.click(screen.getByRole('button', { name: 'Change password' }));

		expect(fetchMock).not.toHaveBeenCalled();
		expect(screen.queryByText('Password changed.')).toBeNull();
	});

	it('shows an error and keeps the password unchanged when the current password is wrong', async () => {
		stubFetch(() => jsonResponse({ error: 'Current password is incorrect' }, 403));
		render(<SettingsPage />);
		await userEvent.type(screen.getByLabelText('Current password'), 'guess');
		await userEvent.type(screen.getByLabelText('New password'), 'new-password-1');
		await userEvent.click(screen.getByRole('button', { name: 'Change password' }));

		expect(await screen.findByText('Current password is incorrect')).toBeTruthy();
		expect(screen.queryByText('Password changed.')).toBeNull();
	});
});
