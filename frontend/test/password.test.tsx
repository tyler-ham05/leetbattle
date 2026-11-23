// Tests for showing a password (US5-Task10, #85) and for the forgot password
// flow (US5-Task9, #84). Pseudocode: test/password-test-pseudo.md
//
// No test touches AuthService: the auth context is a fake, and every request
// the pages make goes to a stubbed fetch that records it.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fakeUser, jsonResponse, requestsOf, stubFetch } from './helpers';

const mocks = vi.hoisted(() => ({
	// The signed-in user; null on the sign-in pages, set for the Settings tests.
	user: null as unknown,
	// The query string of the reset page, e.g. "token=abc".
	search: '',
}));

vi.mock('next/navigation', () => ({
	useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
	useSearchParams: () => new URLSearchParams(mocks.search),
}));
vi.mock('../app/login/context', () => ({
	useAuth: () => ({ login: vi.fn(), signup: vi.fn(), refresh: vi.fn(), user: mocks.user, isLoading: false }),
}));

import LoginPage from '../app/login/page';
import ResetPasswordPage from '../app/login/reset/page';
import SettingsPage from '../app/settings/page';

beforeEach(() => {
	vi.unstubAllGlobals();
	mocks.user = null;
	mocks.search = '';
});

afterEach(() => cleanup());

// The input a label points at.
function field(label: string): HTMLInputElement {
	return screen.getByLabelText(label) as HTMLInputElement;
}

describe('show password on the sign-in page', () => {
	it('US5-Task10 hides the password text by default', () => {
		render(<LoginPage />);

		// A "password" input shows dots instead of the characters.
		expect(field('Password').type).toBe('password');
	});

	it('US5-Task10 shows the password text when the player clicks "Show password"', async () => {
		const user = userEvent.setup();
		render(<LoginPage />);

		await user.click(screen.getByRole('button', { name: 'Show password' }));

		// A "text" input shows the characters as typed.
		expect(field('Password').type).toBe('text');
	});

	it('US5-Task10 relabels the button "Hide password" once the password is shown', async () => {
		const user = userEvent.setup();
		render(<LoginPage />);

		await user.click(screen.getByRole('button', { name: 'Show password' }));

		expect(screen.getByRole('button', { name: 'Hide password' })).toBeTruthy();
	});

	it('US5-Task10 hides the password text again when the player clicks "Hide password"', async () => {
		const user = userEvent.setup();
		render(<LoginPage />);

		await user.click(screen.getByRole('button', { name: 'Show password' }));
		await user.click(screen.getByRole('button', { name: 'Hide password' }));

		expect(field('Password').type).toBe('password');
	});

	it('US5-Task10 tells screen readers the button is pressed while the password is shown', async () => {
		const user = userEvent.setup();
		render(<LoginPage />);

		await user.click(screen.getByRole('button', { name: 'Show password' }));

		expect(screen.getByRole('button', { name: 'Hide password' }).getAttribute('aria-pressed')).toBe('true');
	});

	it('US5-Task10 has a "Show password" button on the sign-up page too', async () => {
		const user = userEvent.setup();
		render(<LoginPage />);

		await user.click(screen.getByRole('tab', { name: 'Sign up' }));

		expect(screen.getByRole('button', { name: 'Show password' })).toBeTruthy();
	});

	it('US5-Task10 has no "Show password" button on a field that is not a password', () => {
		render(<LoginPage />);

		// The sign-in page has two fields, Email and Password, and only one eye button.
		expect(screen.getAllByRole('button', { name: 'Show password' })).toHaveLength(1);
	});
});

describe('show password in Settings', () => {
	beforeEach(() => {
		mocks.user = fakeUser;
	});

	it('US5-Task10 has a "Show password" button on both password fields', () => {
		render(<SettingsPage />);

		// One for "Current password", one for "New password".
		expect(screen.getAllByRole('button', { name: 'Show password' })).toHaveLength(2);
	});

	it('US5-Task10 keeps the new password hidden when the current password is shown', async () => {
		const user = userEvent.setup();
		render(<SettingsPage />);

		// The first eye button belongs to "Current password".
		await user.click(screen.getAllByRole('button', { name: 'Show password' })[0]);

		expect(field('New password').type).toBe('password');
	});
});

// Opens the sign-in page and goes to the "Reset your password" form.
async function openForgot() {
	const user = userEvent.setup();
	render(<LoginPage />);
	await user.click(screen.getByRole('button', { name: 'Forgot password?' }));
	return user;
}

// Opens the form, types an email and sends it. `respond` fakes AuthService's answer.
async function sendResetLink(respond: () => Response = () => jsonResponse({ message: 'ok' })) {
	const fetchMock = stubFetch(respond);
	const user = await openForgot();
	await user.type(field('Email'), 'ada@example.com');
	await user.click(screen.getByRole('button', { name: 'Send reset link' }));
	return { user, fetchMock };
}

describe('asking for a reset link', () => {
	it('US5-Task9 shows "Forgot password?" on the sign-in page', () => {
		render(<LoginPage />);

		expect(screen.getByRole('button', { name: 'Forgot password?' })).toBeTruthy();
	});

	it('US5-Task9 does not show "Forgot password?" on the sign-up page', async () => {
		const user = userEvent.setup();
		render(<LoginPage />);

		await user.click(screen.getByRole('tab', { name: 'Sign up' }));

		// Someone creating an account has no password to forget yet.
		expect(screen.queryByRole('button', { name: 'Forgot password?' })).toBeNull();
	});

	it('US5-Task9 shows the "Reset your password" form when the player clicks "Forgot password?"', async () => {
		await openForgot();

		expect(screen.getByRole('heading', { name: 'Reset your password' })).toBeTruthy();
	});

	it('US5-Task9 sends the email to POST /password/forgot', async () => {
		const { fetchMock } = await sendResetLink();

		await screen.findByRole('heading', { name: 'Check your email' });
		// Only the method, the path and the body matter; the host is AuthService's.
		expect(requestsOf(fetchMock).map(({ method, url, body }) => ({ method, path: new URL(url).pathname, body })))
			.toEqual([{ method: 'POST', path: '/password/forgot', body: { email: 'ada@example.com' } }]);
	});

	it('US5-Task9 shows "Check your email" after the request succeeds', async () => {
		await sendResetLink();

		expect(await screen.findByRole('heading', { name: 'Check your email' })).toBeTruthy();
	});

	it('US5-Task9 says in the confirmation that the link works for 30 minutes', async () => {
		await sendResetLink();

		expect((await screen.findByRole('status')).textContent).toContain('The link works for 30 minutes.');
	});

	it('US5-Task9 shows the error when the request fails', async () => {
		await sendResetLink(() => jsonResponse({ error: 'a valid email is required' }, 400));

		expect(await screen.findByText('a valid email is required')).toBeTruthy();
	});

	it('US5-Task9 returns to the log in form from the reset form', async () => {
		const user = await openForgot();

		await user.click(screen.getByRole('button', { name: 'Back to log in' }));

		expect(screen.getByRole('heading', { name: 'Log in' })).toBeTruthy();
	});

	it('US5-Task9 returns to the log in form from the confirmation', async () => {
		const { user } = await sendResetLink();

		await user.click(await screen.findByRole('button', { name: 'Back to log in' }));

		expect(screen.getByRole('heading', { name: 'Log in' })).toBeTruthy();
	});
});

// Opens the reset page as if from the emailed link, types a new password and submits it.
async function chooseNewPassword(respond: () => Response = () => jsonResponse({ message: 'ok' })) {
	mocks.search = 'token=abc123';
	const fetchMock = stubFetch(respond);
	const user = userEvent.setup();
	render(<ResetPasswordPage />);
	await user.type(field('New password'), 'a-brand-new-password');
	await user.click(screen.getByRole('button', { name: 'Change password' }));
	return fetchMock;
}

describe('choosing a new password from the emailed link', () => {
	it('US5-Task9 shows "Choose a new password" when the link has a token', () => {
		mocks.search = 'token=abc123';
		render(<ResetPasswordPage />);

		expect(screen.getByRole('heading', { name: 'Choose a new password' })).toBeTruthy();
	});

	it('US5-Task9 sends the token and the new password to POST /password/reset', async () => {
		const fetchMock = await chooseNewPassword();

		await screen.findByRole('heading', { name: 'Password changed' });
		expect(requestsOf(fetchMock).map(({ method, url, body }) => ({ method, path: new URL(url).pathname, body })))
			.toEqual([{ method: 'POST', path: '/password/reset', body: { token: 'abc123', newPassword: 'a-brand-new-password' } }]);
	});

	it('US5-Task9 shows "Password changed" after the request succeeds', async () => {
		await chooseNewPassword();

		expect(await screen.findByRole('heading', { name: 'Password changed' })).toBeTruthy();
	});

	it('US5-Task9 links to the log in page after the request succeeds', async () => {
		await chooseNewPassword();

		expect((await screen.findByRole('link', { name: 'Log in' })).getAttribute('href')).toBe('/login');
	});

	it('US5-Task9 shows the server\'s error when it rejects the token', async () => {
		await chooseNewPassword(() => jsonResponse({ error: 'this reset link is invalid or has expired' }, 400));

		expect(await screen.findByText('this reset link is invalid or has expired')).toBeTruthy();
	});

	it('US5-Task9 shows "This reset link is not valid." when the link has no token', () => {
		render(<ResetPasswordPage />);

		expect(screen.getByText('This reset link is not valid.')).toBeTruthy();
	});

	it('US5-Task9 does not show the new password field when the link has no token', () => {
		render(<ResetPasswordPage />);

		expect(screen.queryByLabelText('New password')).toBeNull();
	});
});

// US5-Task13 (#98). Pseudocode: test/password-test-pseudo.md
// AuthService signs out every session issued before a password change, so it
// answers POST /password with a fresh token. Settings must keep that token, or
// the player who just changed their password would be signed out too.
describe('changing the password in Settings', () => {
	beforeEach(() => {
		mocks.user = fakeUser;
		localStorage.setItem('authToken', 'token-from-before-the-change');
	});

	afterEach(() => localStorage.clear());

	it('US5-Task13 stores the new token from POST /password', async () => {
		stubFetch(() => jsonResponse({ message: 'password has been changed', token: 'fresh-token' }));
		const user = userEvent.setup();
		render(<SettingsPage />);

		await user.type(field('Current password'), 'old-password');
		await user.type(field('New password'), 'a-brand-new-password');
		await user.click(screen.getByRole('button', { name: 'Change password' }));
		await screen.findByText('Password changed');

		// The controller keeps the session token under "authToken" (app/login/controller.tsx).
		expect(localStorage.getItem('authToken')).toBe('fresh-token');
	});
});
