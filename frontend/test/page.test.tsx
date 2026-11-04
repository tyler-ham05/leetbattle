// root page should display the landing page with no credentials
// root page should siplay the home page with credentials
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { fakeUser } from './helpers';

const auth = vi.hoisted(() => ({
	value: { user: null as unknown, isLoading: false, logout: () => Promise.resolve() },
}));

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }));
vi.mock('../app/login/context', () => ({ useAuth: () => auth.value }));

import Home from '../app/page';

beforeEach(() => {
	auth.value = { user: null, isLoading: false, logout: () => Promise.resolve() };
});
afterEach(() => {
	cleanup();
});

describe('root page', () => {
	it('displays the landing page when there are no credentials', () => {
		render(<Home />);
		expect(screen.getByText(/Practice under pressure/)).toBeTruthy();
		expect(screen.queryByRole('button', { name: 'Account menu' })).toBeNull();
	});

	it('displays the home page when the user has credentials', () => {
		auth.value = { ...auth.value, user: fakeUser };
		render(<Home />);
		expect(screen.getByRole('button', { name: 'Account menu' })).toBeTruthy();
		expect(screen.getByRole('link', { name: /Practice/ }).getAttribute('href')).toBe('/editor');
		expect(screen.queryByText(/Practice under pressure/)).toBeNull();
	});

	it('renders nothing while the session is still loading', () => {
		auth.value = { ...auth.value, isLoading: true };
		const { container } = render(<Home />);
		expect(container.innerHTML).toBe('');
	});
});
