// Landing page, typed tagline (UI only): the pen-wipe hero and the match demo
// stay; the subtitle becomes a typed mono line; the scroll statements between
// the demo and "Your move" are gone. No backend: the auth context is a fake.
import * as fs from 'fs';
import * as path from 'path';
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

describe('typed tagline', () => {
	it('shows "two teams. same problems. one winner" under the wordmark', () => {
		expect(screen.getByTestId('tagline').textContent).toBe('two teams. same problems. one winner');
	});

	it('types the tagline out', () => {
		expect(screen.getByTestId('tagline').className.split(' ')).toContain('lb-typed');
	});

	it('no longer shows "Team coding battles, live in your browser"', () => {
		expect(screen.queryByText('Team coding battles, live in your browser')).toBeNull();
	});

	it('shows the whole tagline when the player asks for reduced motion', () => {
		const css = fs.readFileSync(path.resolve(__dirname, '../app/globals.css'), 'utf8');
		const reduced = css.slice(css.indexOf('@media (prefers-reduced-motion: reduce)'));
		expect(reduced).toMatch(/\.lb-typed\s*\{\s*width:\s*auto;\s*border-right-color:\s*transparent;\s*animation:\s*none;\s*\}/);
	});
});

describe('the scroll statements are gone', () => {
	it('no longer shows "Two teams"', () => {
		expect(screen.queryByRole('heading', { name: 'Two teams' })).toBeNull();
	});

	it('no longer shows "Same problems"', () => {
		expect(screen.queryByRole('heading', { name: 'Same problems' })).toBeNull();
	});

	it('no longer shows "One winner"', () => {
		expect(screen.queryByRole('heading', { name: 'One winner' })).toBeNull();
	});

	it('no longer shows the clock section', () => {
		expect(screen.queryByRole('region', { name: 'Thirty minutes on the clock' })).toBeNull();
	});

	it('no longer shows the scroll progress bar', () => {
		expect(screen.queryByTestId('scroll-progress')).toBeNull();
	});
});

describe('your move', () => {
	it('still shows "Your move" after the match demo', () => {
		const demo = screen.getByRole('region', { name: 'Demo of a match' });
		const yourMove = screen.getByRole('heading', { name: 'Your move' });
		expect(demo.compareDocumentPosition(yourMove) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
	});

	it('brings "Your move" into focus as it scrolls in', () => {
		expect((screen.getByRole('heading', { name: 'Your move' }).closest('section') as HTMLElement).className.split(' ')).toContain('lb-reveal-view');
	});
});
