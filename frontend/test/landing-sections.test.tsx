// US5-Task15 (#127). Pseudocode: test/landing-sections-test-pseudo.md
// Below the hero, the landing page explains the game with short statements
// that animate as the player scrolls. The animations are CSS (scroll-driven,
// with a fallback), which jsdom does not run, so these tests check what is
// on the page and what screen readers get.
// No test touches a backend service: the auth context is a fake.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';

vi.mock('../app/login/context', () => ({
	useAuth: () => ({ user: null, isLoading: false, logout: vi.fn() }),
}));

import LandingPage from '../app/_landing/landing-page';

beforeEach(() => {
	render(<LandingPage />);
});
afterEach(() => cleanup());

// The section a statement heading belongs to.
function section(name: string): HTMLElement {
	return screen.getByRole('heading', { name }).closest('section') as HTMLElement;
}

// Every element whose own text (ignoring its children) ends in a period.
function linesEndingInPeriod(root: HTMLElement): string[] {
	return Array.from(root.querySelectorAll('*'))
		.map((el) => Array.from(el.childNodes).filter((n) => n.nodeType === 3).map((n) => n.textContent ?? '').join('').trim())
		.filter((text) => text.endsWith('.'));
}

const STATEMENTS = ['Two teams', 'Same problems', 'One winner', 'Your move'];

describe('landing scroll sections', () => {
	it('US5-Task15 shows "Two teams", "Same problems", "One winner" and "Your move", in that order', () => {
		const headings = screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent);
		expect(headings.filter((text) => STATEMENTS.includes(text ?? ''))).toEqual(STATEMENTS);
	});

	it('US5-Task15 no longer shows "How it works"', () => {
		expect(screen.queryByText('How it works')).toBeNull();
	});

	it('US5-Task15 no longer shows "Modes"', () => {
		expect(screen.queryByText('Modes')).toBeNull();
	});
});

describe('two teams', () => {
	it('US5-Task15 shows "1v1 · 2v2 · 3v3"', () => {
		expect(within(section('Two teams')).getByText('1v1 · 2v2 · 3v3')).toBeTruthy();
	});

	it('US5-Task15 does not show "vs"', () => {
		expect(within(section('Two teams')).queryByText('vs')).toBeNull();
	});

	it('US5-Task15 hides the player dots from screen readers', () => {
		expect(screen.getByTestId('team-dots').getAttribute('aria-hidden')).toBe('true');
	});
});

describe('same problems', () => {
	it('US5-Task15 shows Easy, Medium and Hard', () => {
		const labels = within(section('Same problems')).getAllByTestId('difficulty').map((label) => label.textContent);
		expect(labels).toEqual(['Easy', 'Medium', 'Hard']);
	});
});

describe('clock', () => {
	it('US5-Task15 labels the clock section for screen readers', () => {
		expect(screen.getByRole('region', { name: 'Thirty minutes on the clock' })).toBeTruthy();
	});

	it('US5-Task15 hides the clock face from screen readers', () => {
		expect(screen.getByTestId('clock-face').getAttribute('aria-hidden')).toBe('true');
	});

	it('US5-Task15 shows "Every second counts"', () => {
		expect(screen.getByText('Every second counts')).toBeTruthy();
	});

	it('US5-Task15 does not show "30:00"', () => {
		const clock = screen.getByRole('region', { name: 'Thirty minutes on the clock' });
		expect(within(clock).queryByText('30:00')).toBeNull();
	});
});

// (The "Your move" link tests were replaced by US5-Task18's "Play" tests.)

describe('scroll progress and text', () => {
	it('US5-Task15 hides the scroll progress bar from screen readers', () => {
		expect(screen.getByTestId('scroll-progress').getAttribute('aria-hidden')).toBe('true');
	});

	it('US5-Task15 ends no single line of scroll section text with a period', () => {
		expect(linesEndingInPeriod(screen.getByTestId('scroll-sections'))).toEqual([]);
	});
});

// US5-Task16 (#131). Pseudocode: test/landing-sections-test-pseudo.md
// `overflow: hidden` makes an element a scroll container of its own. The
// scroll-driven animations and the sticky clock then follow that wrapper,
// which never scrolls, instead of the page, so nothing moves.
describe('landing scrolling', () => {
	it('US5-Task16 does not use overflow-hidden on the landing page wrapper', () => {
		const wrapper = screen.getByTestId('scroll-sections').closest('.flex-1') as HTMLElement;
		expect(wrapper.className.split(' ')).not.toContain('overflow-hidden');
	});
});
