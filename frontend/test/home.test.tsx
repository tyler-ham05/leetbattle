// Home screen should display user profile
//  - User profile should have a dropdown when clicked that allows user to
//      - Change settings
//      - Log out
// Home screen should show a picker wheel with Practice, Lobby and Settings
//  - Practice should be selected when the page opens
//  - Next and Previous buttons should move the selection, looping around at the ends
//  - Clicking an option on the wheel should select it
//  - Scrolling over the wheel should move the selection
//  - An Open button under the wheel should link to the selected option's page
// Home screen should show a list of the same options under the wheel
//  - Each option should show its title and a one-line description
//  - Practice should link to the editor page, Lobby to the lobby page, Settings to the settings page
//  - Hovering or focusing an option in the list should select it on the wheel
// Home screen should show falling code snippets in the background
//  - The background should be hidden from screen readers
//  - The background should not animate when the user has reduced motion turned on
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fakeUser } from './helpers';

const push = vi.fn();
const logout = vi.fn();

vi.mock('next/navigation', () => ({ useRouter: () => ({ push, replace: vi.fn() }) }));
vi.mock('../app/login/context', () => ({
	useAuth: () => ({ user: fakeUser, logout, isLoading: false }),
}));

import HomeTopBar from '../app/_home/components/topbar';
import HomeActions from '../app/_home/components/home-actions';

// jsdom has no matchMedia. This stands in for the browser's media query API so a
// test can decide whether the user has "reduce motion" turned on.
function stubReducedMotion(reduce: boolean) {
	vi.stubGlobal('matchMedia', (query: string) => ({
		matches: reduce && query === '(prefers-reduced-motion: reduce)',
		media: query,
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
	}));
}

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

describe('home screen picker wheel', () => {
	// The Open button under the wheel is named after the selected option, so it
	// tells us which option is selected and where it will go.
	const openLink = () => screen.getByRole('link', { name: /^Open / });

	beforeEach(() => {
		stubReducedMotion(false);
	});

	it('selects Practice when the page opens', () => {
		render(<HomeActions />);
		expect(openLink().textContent).toMatch(/Open Practice/);
	});

	it('moves the selection with Next and Previous, looping around at the ends', async () => {
		render(<HomeActions />);
		const next = screen.getByRole('button', { name: 'Next' });
		const previous = screen.getByRole('button', { name: 'Previous' });

		await userEvent.click(next);
		expect(openLink().textContent).toMatch(/Open Lobby/);
		await userEvent.click(next);
		expect(openLink().textContent).toMatch(/Open Settings/);
		// Past the last option, the wheel loops back to the first.
		await userEvent.click(next);
		expect(openLink().textContent).toMatch(/Open Practice/);
		// And before the first option, it loops to the last.
		await userEvent.click(previous);
		expect(openLink().textContent).toMatch(/Open Settings/);
	});

	it('selects an option when it is clicked on the wheel', async () => {
		render(<HomeActions />);
		await userEvent.click(screen.getByRole('button', { name: 'Show Lobby' }));
		expect(openLink().textContent).toMatch(/Open Lobby/);
	});

	it('moves the selection when the user scrolls over the wheel', () => {
		render(<HomeActions />);
		fireEvent.wheel(screen.getByRole('group', { name: 'Pick a mode' }), { deltaY: 120 });
		expect(openLink().textContent).toMatch(/Open Lobby/);
	});

	it.each([
		['Practice', '/editor'],
		['Lobby', '/lobby'],
		['Settings', '/settings'],
	])('points the Open button at the %s page', async (title, href) => {
		render(<HomeActions />);
		// Select the option from the list, then check where Open goes.
		await userEvent.hover(within(screen.getByRole('list', { name: 'Menu' })).getByRole('link', { name: new RegExp(title) }));
		expect(openLink().textContent).toMatch(new RegExp(`Open ${title}`));
		expect(openLink().getAttribute('href')).toBe(href);
	});
});

describe('home screen menu list', () => {
	const OPTIONS = [
		{ title: 'Practice', href: '/editor' },
		{ title: 'Lobby', href: '/lobby' },
		{ title: 'Settings', href: '/settings' },
	];
	const list = () => screen.getByRole('list', { name: 'Menu' });

	beforeEach(() => {
		stubReducedMotion(false);
	});

	it('shows Practice, Lobby and Settings, in that order, each with a one-line description', () => {
		render(<HomeActions />);
		const items = within(list()).getAllByRole('listitem');
		expect(items).toHaveLength(OPTIONS.length);
		OPTIONS.forEach((option, i) => {
			expect(within(items[i]).getByText(option.title)).toBeTruthy();
			// Whatever text is left after the title is the description; it must exist.
			const description = (items[i].textContent ?? '').replace(option.title, '').replace(/\d+/, '').trim();
			expect(description.length).toBeGreaterThan(0);
		});
	});

	it.each(OPTIONS)('links $title to $href', ({ title, href }) => {
		render(<HomeActions />);
		expect(within(list()).getByRole('link', { name: new RegExp(title) }).getAttribute('href')).toBe(href);
	});

	it('selects an option on the wheel when it is hovered in the list', async () => {
		render(<HomeActions />);
		await userEvent.hover(within(list()).getByRole('link', { name: /Settings/ }));
		expect(screen.getByRole('link', { name: /^Open / }).textContent).toMatch(/Open Settings/);
	});

	it('selects an option on the wheel when it gets keyboard focus in the list', () => {
		render(<HomeActions />);
		// act() lets React handle the focus event before we check the result.
		act(() => within(list()).getByRole('link', { name: /Lobby/ }).focus());
		expect(screen.getByRole('link', { name: /^Open / }).textContent).toMatch(/Open Lobby/);
	});
});

describe('home screen falling code background', () => {
	it('hides the background from screen readers', () => {
		stubReducedMotion(false);
		const { container } = render(<HomeActions />);
		const background = container.querySelector('[data-code-rain]');
		expect(background).not.toBeNull();
		expect(background?.getAttribute('aria-hidden')).toBe('true');
	});

	it('animates the snippets normally', () => {
		stubReducedMotion(false);
		const { container } = render(<HomeActions />);
		const snippets = container.querySelectorAll('[data-code-rain] [data-snippet]');
		expect(snippets.length).toBeGreaterThan(0);
		snippets.forEach((snippet) => expect(snippet.getAttribute('data-animated')).toBe('true'));
	});

	it('does not animate the snippets when the user has reduced motion turned on', async () => {
		stubReducedMotion(true);
		const { container } = render(<HomeActions />);
		// The preference is read after mount, so wait for the snippets to settle.
		await waitFor(() => {
			const snippets = container.querySelectorAll('[data-code-rain] [data-snippet]');
			expect(snippets.length).toBeGreaterThan(0);
			snippets.forEach((snippet) => expect(snippet.getAttribute('data-animated')).toBe('false'));
		});
	});
});
