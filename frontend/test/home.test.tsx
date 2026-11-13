// Home screen should display user profile
//  - User profile should have a dropdown when clicked that allows user to
//      - Change settings
//      - Log out
//  - Clicking the settings link closes the dropdown
//  - Nothing is rendered when there's no logged-in user (!user)
//  - Falls back to showing the email when user.name is null
// Home screen should look like a game title screen, over the falling code
//  - LeetBattle should be the page heading
//  - The signed-in player's name should show above the title
//  - The menu should list Practice, Lobby and Settings, each with a one-line description
//  - Practice should link to the editor page, Lobby to the lobby page, Settings to the settings page
//  - Practice should be selected when the page opens
//  - Hovering an option should select it
//  - Focusing an option with the keyboard should select it
//  - Arrow down should select the next option and move keyboard focus to it
//  - Arrow up from the first option should wrap around to Log out
//  - Enter, with nothing focused, should open the selected option
//  - Log out should sign the player out
//  - Keyboard hints for selecting and opening should be shown
// Home screen should show falling code snippets in the background
//  - The background should be hidden from screen readers
//  - The background should not animate when the user has reduced motion turned on

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fakeUser } from './helpers';

const push = vi.fn();
const logout = vi.fn();
// A mock we can redirect per-test (e.g. to simulate the logged-out/!user case)
// instead of the fixed fakeUser every test used to get.
const useAuthMock = vi.fn();

vi.mock('next/navigation', () => ({ useRouter: () => ({ push, replace: vi.fn() }) }));
vi.mock('../app/login/context', () => ({
	useAuth: () => useAuthMock(),
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
	useAuthMock.mockReturnValue({ user: fakeUser, logout, isLoading: false });
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

	it('closes the dropdown when the Settings link is clicked', async () => {
		render(<HomeTopBar />);
		await userEvent.click(screen.getByRole('button', { name: 'Account menu' }));
		await userEvent.click(screen.getByRole('link', { name: 'Settings' }));
		expect(screen.queryByText('Settings')).toBeNull();
	});

	it('hides the account menu button when there is no logged-in user', () => {
		useAuthMock.mockReturnValue({ user: null, logout, isLoading: false });
		render(<HomeTopBar />);
		expect(screen.queryByRole('button', { name: 'Account menu' })).toBeNull();
	});

	it('renders no menu wrapper at all when there is no logged-in user', () => {
		useAuthMock.mockReturnValue({ user: null, logout, isLoading: false });
		// UserMenu bails out to `null`; only the topbar's own wordmark/link remain.
		const { container } = render(<HomeTopBar />);
		expect(container.querySelector('.relative')).toBeNull();
	});

	it('shows the email instead of a name when user.name is null', async () => {
		useAuthMock.mockReturnValue({ user: { ...fakeUser, name: null }, logout, isLoading: false });
		render(<HomeTopBar />);
		await userEvent.click(screen.getByRole('button', { name: 'Account menu' }));
		expect(screen.getByText(fakeUser.email)).toBeTruthy();
	});

	it('does not fall back to the (absent) name when user.name is null', async () => {
		useAuthMock.mockReturnValue({ user: { ...fakeUser, name: null }, logout, isLoading: false });
		render(<HomeTopBar />);
		await userEvent.click(screen.getByRole('button', { name: 'Account menu' }));
		expect(screen.queryByText(fakeUser.name as string)).toBeNull();
	});
});

describe('home title screen', () => {
	const OPTIONS = [
		{ title: 'Practice', href: '/editor' },
		{ title: 'Lobby', href: '/lobby' },
		{ title: 'Settings', href: '/settings' },
	];
	const list = () => screen.getByRole('list', { name: 'Menu' });
	// The option marked as selected (the one Enter opens), read by its visible text.
	const selected = () => list().querySelector('[data-selected="true"]')?.textContent ?? '';

	beforeEach(() => {
		stubReducedMotion(false);
	});

	it('shows LeetBattle as the page heading', () => {
		render(<HomeActions />);
		expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('LeetBattle');
	});

	it('shows the name of the signed-in player', () => {
		render(<HomeActions />);
		expect(screen.getByText(new RegExp(fakeUser.name as string))).toBeTruthy();
	});

	it('shows Practice, Lobby and Settings, in that order, each with a one-line description', () => {
		render(<HomeActions />);
		// Each row reads "<title><description>": keep the title only if a description follows it.
		const rows = within(list()).getAllByRole('link').map((link) => {
			const option = OPTIONS.find((o) => link.textContent?.startsWith(o.title));
			const description = (link.textContent ?? '').slice(option?.title.length ?? 0).trim();
			return description ? option?.title : 'no description';
		});
		expect(rows).toEqual(['Practice', 'Lobby', 'Settings']);
	});

	it.each(OPTIONS)('links $title to $href', ({ title, href }) => {
		render(<HomeActions />);
		expect(within(list()).getByRole('link', { name: new RegExp(title) }).getAttribute('href')).toBe(href);
	});

	it('selects Practice when the page opens', () => {
		render(<HomeActions />);
		expect(selected()).toMatch(/^Practice/);
	});

	it('selects an option when it is hovered', async () => {
		render(<HomeActions />);
		await userEvent.hover(within(list()).getByRole('link', { name: /Settings/ }));
		expect(selected()).toMatch(/^Settings/);
	});

	it('selects an option when it gets keyboard focus', () => {
		render(<HomeActions />);
		// act() lets React handle the focus event before we check the result.
		act(() => within(list()).getByRole('link', { name: /Lobby/ }).focus());
		expect(selected()).toMatch(/^Lobby/);
	});

	it('moves keyboard focus to the next option on arrow down', async () => {
		render(<HomeActions />);
		await userEvent.keyboard('{ArrowDown}');
		expect(document.activeElement?.textContent).toMatch(/^Lobby/);
	});

	it('wraps around to Log out on arrow up from the first option', async () => {
		render(<HomeActions />);
		await userEvent.keyboard('{ArrowUp}');
		expect(selected()).toBe('Log out');
	});

	it('opens the selected option on Enter when nothing is focused', async () => {
		render(<HomeActions />);
		await userEvent.hover(within(list()).getByRole('link', { name: /Lobby/ }));
		await userEvent.unhover(within(list()).getByRole('link', { name: /Lobby/ }));
		// Nothing has keyboard focus, so Enter should open whatever is selected.
		(document.activeElement as HTMLElement | null)?.blur();
		await userEvent.keyboard('{Enter}');
		expect(push).toHaveBeenCalledWith('/lobby');
	});

	it('signs the player out from Log out', async () => {
		render(<HomeActions />);
		await userEvent.click(within(list()).getByRole('button', { name: 'Log out' }));
		expect(logout).toHaveBeenCalled();
	});

	it('shows keyboard hints for selecting and opening', () => {
		render(<HomeActions />);
		expect(screen.getByText('Select')).toBeTruthy();
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
