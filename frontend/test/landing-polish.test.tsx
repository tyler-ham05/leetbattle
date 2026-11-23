// US5-Task18 (#140). Pseudocode: test/landing-polish-test-pseudo.md
// A polish pass on the landing page: no intro, one "Play" link, a demo that
// plays once with a Replay button, a demo that stacks on phones, and the
// "Two teams" / "Same problems" sections on opposite sides.
// CSS animations and media queries don't run in jsdom, so those are checked
// in the stylesheet or by class. No test touches a backend service.
import * as fs from 'fs';
import * as path from 'path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';

vi.mock('../app/login/context', () => ({
	useAuth: () => ({ user: null, isLoading: false, logout: vi.fn() }),
}));

import LandingPage from '../app/_landing/landing-page';

afterEach(() => cleanup());

// The section a heading belongs to.
function sectionOf(heading: HTMLElement): HTMLElement {
	return heading.closest('section') as HTMLElement;
}
const hero = () => sectionOf(screen.getByRole('heading', { level: 1 }));
const yourMove = () => sectionOf(screen.getByRole('heading', { name: 'Your move' }));
const OLD_LINKS = /Find a match|Private lobby/;

describe('no intro', () => {
	it('US5-Task18 does not show the full-screen intro', () => {
		render(<LandingPage />);
		// The intro is the only thing on the page with a "Skip" button.
		expect(screen.queryByRole('button', { name: 'Skip' })).toBeNull();
	});
});

describe('one Play link', () => {
	it('US5-Task18 has a "Play" link in the hero', () => {
		render(<LandingPage />);
		expect(within(hero()).getByRole('link', { name: /^Play/ })).toBeTruthy();
	});

	it('US5-Task18 has no "Find a match" or "Private lobby" link in the hero', () => {
		render(<LandingPage />);
		expect(within(hero()).queryAllByRole('link', { name: OLD_LINKS })).toHaveLength(0);
	});

	it('US5-Task18 has a "Play" link in "Your move"', () => {
		render(<LandingPage />);
		expect(within(yourMove()).getByRole('link', { name: /^Play/ })).toBeTruthy();
	});

	it('US5-Task18 has no "Find a match" or "Private lobby" link in "Your move"', () => {
		render(<LandingPage />);
		expect(within(yourMove()).queryAllByRole('link', { name: OLD_LINKS })).toHaveLength(0);
	});
});

describe('the demo plays once', () => {
	it('US5-Task18 does not loop the demo forever', () => {
		const css = fs.readFileSync(path.resolve(__dirname, '../app/globals.css'), 'utf8');
		const loop = css.match(/\.lb-demo-loop\s*\{[^}]*\}/)?.[0] ?? '';
		expect(loop).not.toMatch(/infinite/);
	});

	it('US5-Task18 shows a "Replay" button under the demo', () => {
		render(<LandingPage />);
		expect(screen.getByRole('button', { name: 'Replay' })).toBeTruthy();
	});

	it('US5-Task18 starts the demo again when "Replay" is clicked', () => {
		render(<LandingPage />);
		const before = screen.getByRole('region', { name: 'Demo of a match' });
		fireEvent.click(screen.getByRole('button', { name: 'Replay' }));
		// A fresh demo element means every CSS animation in it starts over.
		expect(screen.getByRole('region', { name: 'Demo of a match' })).not.toBe(before);
	});
});

describe('mobile and layout', () => {
	it('US5-Task18 lets the demo\'s team panels stack on a narrow screen', () => {
		render(<LandingPage />);
		const panels = screen.getByRole('region', { name: 'Team 1' }).parentElement as HTMLElement;
		expect(panels.className.split(' ')).toContain('flex-wrap');
	});
});
