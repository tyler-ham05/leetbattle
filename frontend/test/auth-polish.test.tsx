// Sign up / log in and "Check your email" polish (UI only). The sign-in card
// itself stays as it is. No backend: auth and fetch are mocked.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { jsonResponse, requestsOf, stubFetch } from './helpers';

vi.mock('next/navigation', () => ({
	useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
	useSearchParams: () => new URLSearchParams(''),
}));
vi.mock('../app/login/context', () => ({
	useAuth: () => ({ login: vi.fn(), signup: vi.fn(), user: null, isLoading: false }),
}));

import LoginPage from '../app/login/page';

beforeEach(() => {
	vi.unstubAllGlobals();
});
afterEach(() => {
	cleanup();
	vi.useRealTimers();
});

// The page with the "Sign up" tab chosen.
async function openSignup() {
	const user = userEvent.setup();
	render(<LoginPage />);
	await user.click(screen.getByRole('tab', { name: 'Sign up' }));
	return user;
}

// Is the Name field folded away? (Its wrapper carries data-collapsed.)
function nameCollapsed() {
	return (screen.getByLabelText('Name', { selector: 'input' }) as HTMLElement).closest('[data-collapsed]')?.getAttribute('data-collapsed');
}

// Sends a reset link for ada@example.com, on a fake clock that still moves with real time.
async function sendResetLink() {
	vi.useFakeTimers({ shouldAdvanceTime: true });
	const fetchMock = stubFetch(() => jsonResponse({ message: 'ok' }));
	const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
	render(<LoginPage />);
	await user.click(screen.getByRole('button', { name: 'Forgot password?' }));
	await user.type(screen.getByLabelText('Email'), 'ada@example.com');
	await user.click(screen.getByRole('button', { name: 'Send reset link' }));
	await screen.findByRole('heading', { name: 'Check your email' });
	return { user, fetchMock };
}

describe('log in and sign up tabs', () => {
	it('has "Log in" and "Sign up" tabs', () => {
		render(<LoginPage />);
		expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual(['Log in', 'Sign up']);
	});

	it('selects the "Log in" tab when the page opens', () => {
		render(<LoginPage />);
		expect(screen.getByRole('tab', { name: 'Log in' }).getAttribute('aria-selected')).toBe('true');
	});

	it('selects the "Sign up" tab when it is clicked', async () => {
		await openSignup();
		expect(screen.getByRole('tab', { name: 'Sign up' }).getAttribute('aria-selected')).toBe('true');
	});

	it('shows the "Sign up" heading after clicking the "Sign up" tab', async () => {
		await openSignup();
		expect(screen.getByRole('heading', { name: 'Sign up' })).toBeTruthy();
	});

	it('shows the "Log in" heading again after going back to the "Log in" tab', async () => {
		const user = await openSignup();
		await user.click(screen.getByRole('tab', { name: 'Log in' }));
		expect(screen.getByRole('heading', { name: 'Log in' })).toBeTruthy();
	});

	it('no longer shows the "Need an account?" button', () => {
		render(<LoginPage />);
		expect(screen.queryByRole('button', { name: 'Need an account?' })).toBeNull();
	});
});

describe('the Name field folds instead of popping', () => {
	it('folds the Name field away on log in', () => {
		render(<LoginPage />);
		expect(nameCollapsed()).toBe('true');
	});

	it('opens the Name field on sign up', async () => {
		await openSignup();
		expect(nameCollapsed()).toBe('false');
	});
});

describe('password strength on sign up', () => {
	it('has no strength meter on log in', () => {
		render(<LoginPage />);
		expect(screen.queryByTestId('password-strength')).toBeNull();
	});

	it('says "Weak" for "abc"', async () => {
		const user = await openSignup();
		await user.type(screen.getByLabelText('Password'), 'abc');
		expect(screen.getByTestId('password-strength').textContent).toBe('Weak');
	});

	it('says "Strong" for "Abcdefgh1!"', async () => {
		const user = await openSignup();
		await user.type(screen.getByLabelText('Password'), 'Abcdefgh1!');
		expect(screen.getByTestId('password-strength').textContent).toBe('Strong');
	});
});

describe('check your email', () => {
	it('shows a disabled "Resend in 0:30" right after the link is sent', async () => {
		await sendResetLink();
		expect((screen.getByRole('button', { name: 'Resend in 0:30' }) as HTMLButtonElement).disabled).toBe(true);
	});

	it('offers "Resend link" after 30 seconds', async () => {
		await sendResetLink();
		act(() => {
			vi.advanceTimersByTime(30_000);
		});
		expect(screen.getByRole('button', { name: 'Resend link' })).toBeTruthy();
	});

	it('sends the email to POST /password/forgot again on "Resend link"', async () => {
		const { user, fetchMock } = await sendResetLink();
		act(() => {
			vi.advanceTimersByTime(30_000);
		});
		await user.click(screen.getByRole('button', { name: 'Resend link' }));
		expect(requestsOf(fetchMock).filter((request) => new URL(request.url).pathname === '/password/forgot')).toHaveLength(2);
	});

	it('goes back to "Reset your password" on "Use a different email"', async () => {
		const { user } = await sendResetLink();
		await user.click(screen.getByRole('button', { name: 'Use a different email' }));
		expect(screen.getByRole('heading', { name: 'Reset your password' })).toBeTruthy();
	});

	it('keeps the typed email when going back with "Use a different email"', async () => {
		const { user } = await sendResetLink();
		await user.click(screen.getByRole('button', { name: 'Use a different email' }));
		expect((screen.getByLabelText('Email') as HTMLInputElement).value).toBe('ada@example.com');
	});
});
