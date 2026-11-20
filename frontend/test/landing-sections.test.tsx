// US5-Task15 (#127). Pseudocode: test/landing-sections-test-pseudo.md
// Below the hero, the landing page explains the game with short statements
// that animate as the player scrolls. The animations are CSS (scroll-driven,
// with a fallback), which jsdom does not run, so these tests check what is
// on the page and what screen readers get.
// No test touches a backend service: the auth context is a fake.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

vi.mock('../app/login/context', () => ({
	useAuth: () => ({ user: null, isLoading: false, logout: vi.fn() }),
}));

import LandingPage from '../app/_landing/landing-page';

beforeEach(() => {
	render(<LandingPage />);
});
afterEach(() => cleanup());

// (The "Two teams" / "Same problems" / clock / "One winner" sections and the
// scroll progress bar were removed with the typed tagline; see landing-typed.test.tsx.)
describe('landing scroll sections', () => {
	it('US5-Task15 no longer shows "How it works"', () => {
		expect(screen.queryByText('How it works')).toBeNull();
	});

	it('US5-Task15 no longer shows "Modes"', () => {
		expect(screen.queryByText('Modes')).toBeNull();
	});
});

// US5-Task16 (#131). Pseudocode: test/landing-sections-test-pseudo.md
// `overflow: hidden` makes an element a scroll container of its own. The
// scroll-driven animations and the sticky clock then follow that wrapper,
// which never scrolls, instead of the page, so nothing moves.
describe('landing scrolling', () => {
	it('US5-Task16 does not use overflow-hidden on the landing page wrapper', () => {
		const wrapper = screen.getByRole('heading', { name: 'Your move' }).closest('.flex-1') as HTMLElement;
		expect(wrapper.className.split(' ')).not.toContain('overflow-hidden');
	});
});
