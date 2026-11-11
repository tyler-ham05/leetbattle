// Every page should have a way back to the home page
//  - Practice should show a link to the home page
//  - Settings should show a link to the home page
//  - Sign in should show a link to the home page
// The home link should work for keyboard and screen reader users
//  - It should be named "LeetBattle home" for screen readers
//  - It should be the first thing the Tab key reaches on a page
//  - It should show an underline, not a box, when reached with the keyboard
// The top bar menu should be a three-line button with a dropdown
//  - The menu button should show three lines
//  - The menu should link to Home, Practice, Lobby and Settings
//  - The menu button should tell screen readers whether the menu is open
//  - Pressing Escape should close the menu
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fakeUser, jsonResponse, stubFetch, threeProblems } from './helpers';

// The signed-in user can be swapped per test (sign in needs a signed-out visitor).
const auth = vi.hoisted(() => ({ value: { user: null as unknown, isLoading: false } }));

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }) }));
vi.mock('../app/login/context', () => ({ useAuth: () => auth.value }));
// Monaco needs a real browser; the practice page only needs something to render.
vi.mock('@monaco-editor/react', () => ({ default: () => <textarea data-testid="monaco" /> }));

import EditorPage from '../app/editor/page';
import SettingsPage from '../app/settings/page';
import LoginPage from '../app/login/page';
import HomeTopBar from '../app/_home/components/topbar';

// The link back to the home page, found the way a screen reader would announce it.
function homeLink() {
	return screen.getByRole('link', { name: 'LeetBattle home' });
}

beforeEach(() => {
	vi.unstubAllGlobals();
	auth.value = { user: fakeUser, isLoading: false };
	// The practice page loads its problems on open; answer locally.
	stubFetch(() => jsonResponse(threeProblems));
});
afterEach(() => {
	cleanup();
});

describe('a way back to the home page', () => {
	it('practice links to the home page', () => {
		render(<EditorPage />);
		expect(homeLink().getAttribute('href')).toBe('/');
	});

	it('settings links to the home page', () => {
		render(<SettingsPage />);
		expect(homeLink().getAttribute('href')).toBe('/');
	});

	it('sign in links to the home page', () => {
		// Sign in is only shown to visitors who are signed out.
		auth.value = { user: null, isLoading: false };
		render(<LoginPage />);
		expect(homeLink().getAttribute('href')).toBe('/');
	});
});

describe('the home link for keyboard and screen reader users', () => {
	it('is named "LeetBattle home" for screen readers', () => {
		render(<SettingsPage />);
		// getByRole throws if no link has this accessible name.
		expect(homeLink()).toBeTruthy();
	});

	it('is the first thing the Tab key reaches', async () => {
		render(<EditorPage />);
		await userEvent.tab();
		expect(document.activeElement).toBe(homeLink());
	});

	it('shows an underline, not a box, when reached with the keyboard', () => {
		render(<SettingsPage />);
		// Keyboard focus is marked with an underline; no outline box is drawn.
		expect(homeLink().className).not.toMatch(/outline/);
	});
});

describe('the top bar menu', () => {
	const menuButton = () => screen.getByRole('button', { name: 'Account menu' });

	it('shows three lines on the menu button', () => {
		render(<HomeTopBar />);
		// The icon is drawn as three horizontal lines.
		expect(menuButton().querySelectorAll('svg line').length).toBe(3);
	});

	it('links to Home, Practice, Lobby and Settings', async () => {
		render(<HomeTopBar />);
		await userEvent.click(menuButton());
		// Only the links inside the open dropdown (a navigation list named "Site"), in order.
		const links = within(screen.getByRole('navigation', { name: 'Site' })).getAllByRole('link').map((link) => link.getAttribute('href'));
		expect(links).toEqual(['/', '/editor', '/lobby', '/settings']);
	});

	it('tells screen readers when the menu is open', async () => {
		render(<HomeTopBar />);
		await userEvent.click(menuButton());
		expect(menuButton().getAttribute('aria-expanded')).toBe('true');
	});

	it('closes the menu when Escape is pressed', async () => {
		render(<HomeTopBar />);
		await userEvent.click(menuButton());
		await userEvent.keyboard('{Escape}');
		expect(screen.queryByRole('navigation', { name: 'Site' })).toBeNull();
	});
});
