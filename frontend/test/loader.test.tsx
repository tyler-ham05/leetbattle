// Pages should play a short loading animation when they open
//  - The loader should show the LeetBattle wordmark
//  - The loader should be hidden from screen readers
//  - The loader should go away once its animation ends
//  - The loader should not show when the user has reduced motion turned on
//  - The loader should play every time a page is opened or refreshed
// Each main page should have its own loader, sub pages share one
//  - Home should play the katana slice
//  - Practice should play the pen-tip wipe
//  - Settings should play the pen-tip wipe
//  - Sign in should play the pen-tip wipe
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render } from '@testing-library/react';
import { fakeUser, jsonResponse, stubFetch, threeProblems } from './helpers';

// The signed-in user can be swapped per test (sign in needs a signed-out visitor).
const auth = vi.hoisted(() => ({ value: { user: null as unknown, isLoading: false } }));

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }) }));
vi.mock('../app/login/context', () => ({ useAuth: () => auth.value }));
// Monaco needs a real browser; the practice page only needs something to render.
vi.mock('@monaco-editor/react', () => ({ default: () => <textarea data-testid="monaco" /> }));

import PageLoader, { LOADER_MS } from '../app/_shared/page-loader';
import Home from '../app/page';
import EditorPage from '../app/editor/page';
import SettingsPage from '../app/settings/page';
import LoginPage from '../app/login/page';

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

// The loader on screen, or null when none is showing.
function loader() {
	return document.querySelector('[data-loader]');
}

beforeEach(() => {
	vi.unstubAllGlobals();
	stubReducedMotion(false);
	auth.value = { user: fakeUser, isLoading: false };
});
afterEach(() => {
	cleanup();
	vi.useRealTimers();
});

describe('page loader', () => {
	it('shows the LeetBattle wordmark', () => {
		render(<PageLoader variant="katana" />);
		// The wordmark is split into "Leet" and a coloured "Battle", so compare the whole text.
		expect(loader()?.textContent).toContain('LeetBattle');
	});

	it('is hidden from screen readers', () => {
		render(<PageLoader variant="katana" />);
		// It is decoration only; screen readers should go straight to the page.
		expect(loader()?.getAttribute('aria-hidden')).toBe('true');
	});

	it('goes away once its animation ends', () => {
		vi.useFakeTimers();
		render(<PageLoader variant="katana" />);
		// Jump past the whole animation.
		act(() => {
			vi.advanceTimersByTime(LOADER_MS.katana);
		});
		expect(loader()).toBeNull();
	});

	it('does not show when the user has reduced motion turned on', () => {
		stubReducedMotion(true);
		render(<PageLoader variant="katana" />);
		expect(loader()).toBeNull();
	});

	it('plays again every time the page is opened', () => {
		// First visit plays...
		const first = render(<PageLoader variant="katana" />);
		first.unmount();
		// ...and coming back to (or refreshing) the same page plays it again.
		render(<PageLoader variant="katana" />);
		expect(loader()).not.toBeNull();
	});
});

describe('which loader each page plays', () => {
	it('home plays the katana slice', () => {
		render(<Home />);
		expect(loader()?.getAttribute('data-loader')).toBe('katana');
	});

	it('practice plays the pen-tip wipe', () => {
		// The practice page loads its problems on open; answer locally.
		stubFetch(() => jsonResponse(threeProblems));
		render(<EditorPage />);
		expect(loader()?.getAttribute('data-loader')).toBe('pen');
	});

	it('settings plays the pen-tip wipe', () => {
		render(<SettingsPage />);
		expect(loader()?.getAttribute('data-loader')).toBe('pen');
	});

	it('sign in plays the pen-tip wipe', () => {
		// Sign in is only shown to visitors who are signed out.
		auth.value = { user: null, isLoading: false };
		render(<LoginPage />);
		expect(loader()?.getAttribute('data-loader')).toBe('pen');
	});
});
