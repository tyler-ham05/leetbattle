// US5-Task14 (#126). Pseudocode: test/landing-hero-test-pseudo.md
// The landing hero shows the LeetBattle wordmark (drawn in by the page
// loader's pen-tip wipe), and a looping demo where Team 1 beats Team 2.
// The animations themselves are CSS, which jsdom does not run, so these
// tests check what is on the page; reduced motion is checked in the CSS.
// No test touches a backend service: the auth context is a fake.
import * as fs from 'fs';
import * as path from 'path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';

vi.mock('../app/login/context', () => ({
	useAuth: () => ({ user: null, isLoading: false, logout: vi.fn() }),
}));

import LandingPage from '../app/_landing/landing-page';
import MatchDemo from '../app/_landing/match-demo';

afterEach(() => cleanup());

// The hero: the first section of the landing page, holding the h1.
function hero(): HTMLElement {
	render(<LandingPage />);
	return screen.getByRole('heading', { level: 1 }).closest('section') as HTMLElement;
}

// Every element whose own text (ignoring its children) is a single line
// ending in a period. Code in the demo can have a period mid-line, never at the end.
function linesEndingInPeriod(root: HTMLElement): string[] {
	return Array.from(root.querySelectorAll('*'))
		.map((el) => Array.from(el.childNodes).filter((n) => n.nodeType === 3).map((n) => n.textContent ?? '').join('').trim())
		.filter((text) => text.endsWith('.'));
}

describe('landing hero', () => {
	it('US5-Task14 shows "LeetBattle" as the main heading', () => {
		render(<LandingPage />);
		expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('LeetBattle');
	});

	it('US5-Task14 does not show the old "Practice under pressure" slogan', () => {
		render(<LandingPage />);
		expect(screen.queryByText(/Practice under pressure/)).toBeNull();
	});

	it('US5-Task14 has a pen-tip cursor after the wordmark', () => {
		render(<LandingPage />);
		expect(screen.getByTestId('pen-tip')).toBeTruthy();
	});

	it('US5-Task14 hides the pen-tip cursor from screen readers', () => {
		render(<LandingPage />);
		expect(screen.getByTestId('pen-tip').getAttribute('aria-hidden')).toBe('true');
	});

	// (The hero's "Find a match" / "Private lobby" tests were replaced by US5-Task18's "Play" tests.)

	it('US5-Task14 shows the whole wordmark when the player asks for reduced motion', () => {
		// jsdom does not evaluate media queries, so check the stylesheet: under
		// reduced motion the wordmark is not clipped and not animated.
		const css = fs.readFileSync(path.resolve(__dirname, '../app/globals.css'), 'utf8');
		const reduced = css.slice(css.indexOf('@media (prefers-reduced-motion: reduce)'));
		expect(reduced).toMatch(/\.lb-hero-word\s*\{\s*clip-path:\s*none;\s*animation:\s*none;\s*\}/);
	});

	it('US5-Task14 ends no single line of hero text with a period', () => {
		expect(linesEndingInPeriod(hero())).toEqual([]);
	});
});

describe('landing match demo', () => {
	it('US5-Task14 shows a Team 1 panel', () => {
		render(<MatchDemo />);
		expect(screen.getByRole('region', { name: 'Team 1' })).toBeTruthy();
	});

	it('US5-Task14 shows a Team 2 panel', () => {
		render(<MatchDemo />);
		expect(screen.getByRole('region', { name: 'Team 2' })).toBeTruthy();
	});

	it('US5-Task14 shows both teams the same problem', () => {
		render(<MatchDemo />);
		// The first line of each team's code is the function signature.
		const first = (team: string) => within(screen.getByRole('region', { name: team })).getAllByTestId('code-line')[0].textContent;
		expect(first('Team 1')).toBe(first('Team 2'));
	});

	it('US5-Task14 gives Team 1\'s submit button a "Submit" label', () => {
		render(<MatchDemo />);
		expect(within(screen.getByRole('region', { name: 'Team 1' })).getByText('Submit')).toBeTruthy();
	});

	it('US5-Task14 gives Team 1\'s submit button a "Running" label', () => {
		render(<MatchDemo />);
		expect(within(screen.getByRole('region', { name: 'Team 1' })).getByText('Running')).toBeTruthy();
	});

	it('US5-Task14 gives Team 1\'s submit button a "Passed" label', () => {
		render(<MatchDemo />);
		expect(within(screen.getByRole('region', { name: 'Team 1' })).getByText('Passed')).toBeTruthy();
	});

	it('US5-Task14 shows Team 1\'s test results', () => {
		render(<MatchDemo />);
		const results = within(screen.getByRole('region', { name: 'Team 1' })).getAllByTestId('test-result');
		expect(results.map((result) => result.textContent)).toEqual(['case 1', 'case 2', 'hidden 6/6']);
	});

	it('US5-Task14 can show Team 1\'s score of 100', () => {
		render(<MatchDemo />);
		expect(screen.getByText('100')).toBeTruthy();
	});

	it('US5-Task14 shows "Team 1 wins"', () => {
		render(<MatchDemo />);
		expect(screen.getByText('Team 1 wins')).toBeTruthy();
	});

	it('US5-Task14 does not put "Team 1 wins" in a box', () => {
		render(<MatchDemo />);
		// A box would come from a border or a background class.
		expect(screen.getByText('Team 1 wins').className).not.toMatch(/\b(border|bg-)/);
	});

	it('US5-Task14 labels the demo for screen readers', () => {
		render(<MatchDemo />);
		expect(screen.getByRole('region', { name: 'Demo of a match' })).toBeTruthy();
	});

	it('US5-Task14 ends no single line of demo text with a period', () => {
		const { container } = render(<MatchDemo />);
		expect(linesEndingInPeriod(container)).toEqual([]);
	});
});
