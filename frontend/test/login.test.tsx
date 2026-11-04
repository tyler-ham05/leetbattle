// User should be able to log in with correct credentials
// User should not be able to log in with incorrect credentials
// User should be able to direct themselves to a sign-up page
// - Sign up page should allow user to input a username, email, and password
// - Sign up page should handle errors accordingly
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fakeUser, jsonResponse, requestsOf, stubFetch } from './helpers';

const push = vi.fn();
const login = vi.fn();
const signup = vi.fn();

vi.mock('next/navigation', () => ({ useRouter: () => ({ push, replace: vi.fn() }) }));
vi.mock('../app/login/context', () => ({
	useAuth: () => ({ login, signup, user: null, isLoading: false }),
}));

import LoginPage from '../app/login/page';
import { AuthAPIService } from '../app/login/controller';

beforeEach(() => {
	vi.clearAllMocks();
	vi.unstubAllGlobals();
	localStorage.clear();
});
afterEach(() => {
	cleanup();
});

async function fillLogin(email: string, password: string) {
	await userEvent.type(screen.getByLabelText('Email'), email);
	await userEvent.type(screen.getByLabelText('Password'), password);
}

describe('logging in', () => {
	it('logs in with the entered credentials and goes to the home page', async () => {
		login.mockResolvedValue(undefined);
		render(<LoginPage />);
		await fillLogin('ada@example.com', 'correct-horse');
		await userEvent.click(screen.getByRole('button', { name: 'Log in' }));

		await waitFor(() => expect(login).toHaveBeenCalledWith('ada@example.com', 'correct-horse'));
		expect(push).toHaveBeenCalledWith('/');
	});

	it('shows the server error and stays on the page for incorrect credentials', async () => {
		login.mockRejectedValue(new Error('Invalid email or password'));
		render(<LoginPage />);
		await fillLogin('ada@example.com', 'wrong');
		await userEvent.click(screen.getByRole('button', { name: 'Log in' }));

		expect(await screen.findByText('Invalid email or password')).toBeTruthy();
		expect(push).not.toHaveBeenCalled();
	});
});

describe('sign-up page', () => {
	async function openSignup() {
		render(<LoginPage />);
		await userEvent.click(screen.getByRole('button', { name: 'Need an account?' }));
	}

	it('can be reached from the login page', async () => {
		await openSignup();
		expect(screen.getByRole('heading', { name: 'Sign up' })).toBeTruthy();
	});

	it('asks for a username, email and password', async () => {
		await openSignup();
		expect(screen.getByLabelText('Name')).toBeTruthy();
		expect(screen.getByLabelText('Email')).toBeTruthy();
		expect(screen.getByLabelText('Password')).toBeTruthy();
	});

	it('submits name, email and password to signup and goes home', async () => {
		signup.mockResolvedValue(undefined);
		await openSignup();
		await userEvent.type(screen.getByLabelText('Name'), 'Ada');
		await fillLogin('ada@example.com', 'long-enough-pw');
		await userEvent.click(screen.getByRole('button', { name: 'Sign up' }));

		// Context signature is signup(email, password, name).
		await waitFor(() => expect(signup).toHaveBeenCalledWith('ada@example.com', 'long-enough-pw', 'Ada'));
		expect(push).toHaveBeenCalledWith('/');
	});

	it('shows an error and does not navigate when sign-up fails', async () => {
		signup.mockRejectedValue(new Error('Email already in use'));
		await openSignup();
		await userEvent.type(screen.getByLabelText('Name'), 'Ada');
		await fillLogin('ada@example.com', 'long-enough-pw');
		await userEvent.click(screen.getByRole('button', { name: 'Sign up' }));

		expect(await screen.findByText('Email already in use')).toBeTruthy();
		expect(push).not.toHaveBeenCalled();
	});

	it('can switch back to logging in', async () => {
		await openSignup();
		await userEvent.click(screen.getByRole('button', { name: 'Already have an account?' }));
		expect(screen.getByRole('heading', { name: 'Log in' })).toBeTruthy();
	});
});

// The real client, with only the network stubbed: this is what actually decides
// whether credentials are "correct".
describe('AuthAPIService.login', () => {
	it('stores the token and returns the user for correct credentials', async () => {
		const fetchMock = stubFetch(() => jsonResponse({ user: fakeUser, token: 'tok123' }));
		const user = await new AuthAPIService().login('ada@example.com', 'pw');

		expect(user).toEqual(fakeUser);
		expect(localStorage.getItem('authToken')).toBe('tok123');
		const [request] = requestsOf(fetchMock);
		expect(request.url).toMatch(/\/login$/);
		expect(request.body).toEqual({ email: 'ada@example.com', password: 'pw' });
	});

	it('rejects with the server message and stores no token for incorrect credentials', async () => {
		stubFetch(() => jsonResponse({ error: 'Invalid email or password' }, 401));
		await expect(new AuthAPIService().login('ada@example.com', 'bad')).rejects.toThrow(
			'Invalid email or password',
		);
		expect(localStorage.getItem('authToken')).toBeNull();
	});
});
