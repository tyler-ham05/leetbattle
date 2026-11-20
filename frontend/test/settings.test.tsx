// settings page should allow user to change their username
// settings page should allow user to change their password
// - user should not be able to change their password if they do not remember their password
// - clicking the Back link navigates back
// - clicking the light/dark mode button toggles the theme
// - clicking each color scheme button marks it as the pressed/selected one
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fakeUser, jsonResponse, requestsOf, stubFetch } from './helpers';

const refresh = vi.fn();
const back = vi.fn();

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back }) }));
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
	// ThemeControls writes directly to <html>, outside localStorage/React
	// state, so it has to be reset by hand between tests.
	document.documentElement.removeAttribute('data-mode');
	document.documentElement.removeAttribute('data-scheme');
});

describe('back link', () => {
	it('navigates back when clicked', async () => {
		render(<SettingsPage />);
		await userEvent.click(screen.getByRole('button', { name: 'Back' }));
		expect(back).toHaveBeenCalledTimes(1);
	});
});

describe('theme controls', () => {
	// No data-mode attribute is set, so it falls back to DEFAULT_MODE ('dark'),
	// meaning the button starts offering to switch to light mode.
	it('switches to light mode when the mode button is clicked', async () => {
		render(<SettingsPage />);
		await userEvent.click(screen.getByRole('button', { name: 'Switch to light mode' }));
		// The attribute change is picked up asynchronously via MutationObserver.
		expect(await screen.findByRole('button', { name: 'Switch to dark mode' })).toBeTruthy();
	});

	it('switches back to dark mode when the mode button is clicked again', async () => {
		render(<SettingsPage />);
		await userEvent.click(screen.getByRole('button', { name: 'Switch to light mode' }));
		await userEvent.click(await screen.findByRole('button', { name: 'Switch to dark mode' }));
		expect(await screen.findByRole('button', { name: 'Switch to light mode' })).toBeTruthy();
	});

	it.each(['Emerald', 'Midnight', 'Nocturne', 'Shoreline', 'Merlot', 'Coffee', 'Performative', 'Lilac', 'Tidepool', 'Sugarplum', 'Vim'])('marks %s as pressed when it is clicked', async (label) => {
		render(<SettingsPage />);
		await userEvent.click(screen.getByRole('button', { name: `${label} color scheme` }));
		// The attribute change is picked up asynchronously via MutationObserver,
		// and (unlike the mode button) the accessible name doesn't change, so
		// we have to poll the aria-pressed attribute itself.
		await waitFor(() =>
			expect(screen.getByRole('button', { name: `${label} color scheme` }).getAttribute('aria-pressed')).toBe('true'),
		);
	});
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

// Settings sections (UI fix, see settings-sections-test-pseudo.md): "Change password"
// used to look like one more field label above "Current password".
describe('settings sections', () => {
	it('has a "Change password" section', () => {
		render(<SettingsPage />);
		expect(screen.getByRole('region', { name: 'Change password' })).toBeTruthy();
	});

	it('puts the "Current password" field inside the "Change password" section', () => {
		render(<SettingsPage />);
		const section = screen.getByRole('region', { name: 'Change password' });
		expect(section.contains(screen.getByLabelText('Current password'))).toBe(true);
	});

	it('separates the "Change password" section from the name with a divider', () => {
		render(<SettingsPage />);
		expect(screen.getByRole('region', { name: 'Change password' }).className).toContain('border-t');
	});

	it('makes the "Change password" heading larger than the field labels', () => {
		render(<SettingsPage />);
		expect(screen.getByRole('heading', { name: 'Change password' }).className).toContain('text-base');
	});

	it('has a "Theme" section', () => {
		render(<SettingsPage />);
		expect(screen.getByRole('region', { name: 'Theme' })).toBeTruthy();
	});

	it('separates the "Theme" section from the password section with a divider', () => {
		render(<SettingsPage />);
		expect(screen.getByRole('region', { name: 'Theme' }).className).toContain('border-t');
	});

	// Layout A: the account forms stay a narrow column and Theme gets its own,
	// wider column, so the page stops leaving empty space at the sides.
	it('puts the "Theme" section in its own column, outside the account column', () => {
		render(<SettingsPage />);
		const accountColumn = screen.getByRole('region', { name: 'Change password' }).parentElement;
		expect(accountColumn?.contains(screen.getByRole('region', { name: 'Theme' }))).toBe(false);
	});

	// Bug: the two columns were capped at 1040px and centered, leaving empty
	// space on both sides of wide screens. They should span the full width.
	it('lets the two columns span the full width on wide screens', () => {
		render(<SettingsPage />);
		expect(screen.getByRole('region', { name: 'Theme' }).parentElement?.className).toContain('lg:max-w-none');
	});

	// Full width still needs breathing room: the same side margins as the home screen.
	it('keeps the home screen side margins', () => {
		render(<SettingsPage />);
		expect(screen.getByRole('main').className).toContain('px-[clamp(24px,8vw,110px)]');
	});

	// ...and start at the top under the top bar instead of floating mid-page.
	it('starts the settings at the top of the page', () => {
		render(<SettingsPage />);
		expect(screen.getByRole('main').className).toContain('items-start');
	});

	it('lays the account and theme columns side by side on wide screens', () => {
		render(<SettingsPage />);
		expect(screen.getByRole('region', { name: 'Theme' }).parentElement?.className).toContain('lg:grid-cols-');
	});
});
