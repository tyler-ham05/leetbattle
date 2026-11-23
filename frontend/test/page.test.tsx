// root page should display the landing page with no credentials
// root page should siplay the home page with credentials
// Sprint 4: the light/dark button should be on these pages too
//  - The signed-in home page should have the "Switch to light mode" button
//  - The landing page should have the "Switch to light mode" button
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
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
		expect(screen.getByRole('heading', { level: 1, name: 'LeetBattle' })).toBeTruthy();
		expect(screen.queryByRole('button', { name: 'Account menu' })).toBeNull();
	});

	it('displays the home page when the user has credentials', () => {
		auth.value = { ...auth.value, user: fakeUser };
		render(<Home />);
		expect(screen.getByRole('button', { name: 'Account menu' })).toBeTruthy();
		// The home menu has several links mentioning Practice (the list row and the
		// wheel's Open button), so look for it inside the menu list.
		const menu = screen.getByRole('list', { name: 'Menu' });
		expect(within(menu).getByRole('link', { name: /Practice/ }).getAttribute('href')).toBe('/editor');
		// The landing page's hero cursor (US5-Task14) is not on the home page.
		expect(screen.queryByTestId('pen-tip')).toBeNull();
	});

	it('renders nothing while the session is still loading', () => {
		auth.value = { ...auth.value, isLoading: true };
		const { container } = render(<Home />);
		expect(container.innerHTML).toBe('');
	});
});

describe('root page light/dark button', () => {
	it('is on the signed-in home page', () => {
		auth.value = { ...auth.value, user: fakeUser };
		render(<Home />);
		expect(screen.getByRole('button', { name: 'Switch to light mode' })).toBeTruthy();
	});

	it('is on the landing page', () => {
		render(<Home />);
		expect(screen.getByRole('button', { name: 'Switch to light mode' })).toBeTruthy();
	});
});
