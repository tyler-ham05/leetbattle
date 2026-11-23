// US-4-T-6: scoring feels like a moment. The top bar's score counts up from
// the old score to the new one, and when the player's team solves a question
// before the rival team, a short "Q2 / Solved first" moment slams in over the
// middle of the screen with a slash through it, then fades.
//
// Pure rendering with fake timers: no sockets, no backend.
import fs from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { ScoreLine } from '../app/editor/components/scoreboard';
import ScoreFeed from '../app/game/components/score-feed';

const css = fs.readFileSync(path.resolve(__dirname, '../app/globals.css'), 'utf8');
// The prefers-reduced-motion block(s) in globals.css, joined.
const reduced = css.split('@media (prefers-reduced-motion: reduce)').slice(1).join('\n');
// The body of one @keyframes block, by name.
const keyframes = (name: string) => css.match(new RegExp(`@keyframes ${name}\\s*\\{((?:[^{}]*\\{[^}]*\\})*)[^}]*\\}`))?.[1] ?? '';

// The match pool after the bans: Q1, Q2, Q3 in order.
const pool = [
	{ taskId: 'two-sum', questionId: 1, difficulty: 'Easy', topics: [], bannedBy: null, pickedBy: { a: null, b: null } },
	{ taskId: 'valid-parentheses', questionId: 2, difficulty: 'Easy', topics: [], bannedBy: null, pickedBy: { a: null, b: null } },
	{ taskId: 'best-time-to-buy-and-sell-stock', questionId: 3, difficulty: 'Medium', topics: [], bannedBy: null, pickedBy: { a: null, b: null } },
];
const NONE = { a: [] as string[], b: [] as string[] };

// Pretends the system does (or doesn't) ask for less motion.
function motion(reduce: boolean) {
	vi.stubGlobal('matchMedia', (query: string) => ({ matches: reduce, media: query, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
}

// Moves the fake clock (timers, animation frames and performance.now) forward.
function after(ms: number) {
	act(() => {
		vi.advanceTimersByTime(ms);
	});
}

beforeEach(() => {
	vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame', 'cancelAnimationFrame', 'performance', 'Date'] });
	motion(false);
});
afterEach(() => {
	cleanup();
	vi.useRealTimers();
	vi.unstubAllGlobals();
});

describe('top bar score counts up', () => {
	// Renders the score line for a player on team a and returns a function
	// that re-renders it with new scores.
	function renderLine(scores: { a: number; b: number }) {
		const view = render(<ScoreLine scores={scores} myTeam="a" time="20:00" />);
		return (next: { a: number; b: number }) => view.rerender(<ScoreLine scores={next} myTeam="a" time="20:00" />);
	}
	const yourScore = () => Number(screen.getByTestId('score-a').textContent);

	// Loading the page mid-match shows the score as it is, no count from 0.
	it('shows the score straight away when the page first shows it', () => {
		renderLine({ a: 150, b: 0 });
		expect(yourScore()).toBe(150);
	});

	// A moment after the rise, the number is on its way, not there yet...
	it('is still counting just after the score goes up', () => {
		const update = renderLine({ a: 0, b: 0 });
		update({ a: 150, b: 0 });
		after(100);
		expect(yourScore()).toBeLessThan(150);
	});

	// ...but it has started moving up from the old score.
	it('has moved past the old score just after the score goes up', () => {
		const update = renderLine({ a: 50, b: 0 });
		update({ a: 150, b: 0 });
		after(100);
		expect(yourScore()).toBeGreaterThan(50);
	});

	// After 0.6s the count lands on the new score.
	it('lands on the new score once the count is done', () => {
		const update = renderLine({ a: 0, b: 0 });
		update({ a: 150, b: 0 });
		after(700);
		expect(yourScore()).toBe(150);
	});

	// Less motion: no count, the new score just appears.
	it('shows a new score straight away with reduced motion', () => {
		motion(true);
		const update = renderLine({ a: 0, b: 0 });
		update({ a: 150, b: 0 });
		expect(yourScore()).toBe(150);
	});
});

describe('solved first', () => {
	// Renders the feed for a player on team a with what was solved at page
	// load, and returns a function that sends a newer game state's solved lists.
	function renderFeed(solved: { a: string[]; b: string[] }) {
		const view = render(<ScoreFeed pool={pool} solved={solved} myTeam="a" />);
		return (next: { a: string[]; b: string[] }) => view.rerender(<ScoreFeed pool={pool} solved={next} myTeam="a" />);
	}
	const moment = () => screen.queryByTestId('first-solve');

	// Your team gets Q2 while the rival team has nothing: the moment plays.
	it('shows the moment when your team solves a question the rival has not', () => {
		renderFeed(NONE)({ a: ['valid-parentheses'], b: [] });
		expect(moment()).not.toBeNull();
	});

	// The moment names the question by its place in the pool.
	it('names the question as Q<n>', () => {
		renderFeed(NONE)({ a: ['valid-parentheses'], b: [] });
		expect(moment()?.textContent).toContain('Q2');
	});

	// And says why it is a moment.
	it('says Solved first', () => {
		renderFeed(NONE)({ a: ['valid-parentheses'], b: [] });
		expect(moment()?.textContent).toContain('Solved first');
	});

	// It is short: gone after 1.4 seconds.
	it('is gone after 1.4 seconds', () => {
		renderFeed(NONE)({ a: ['valid-parentheses'], b: [] });
		after(1400);
		expect(moment()).toBeNull();
	});

	// The feed line already announces the solve, so screen readers skip this.
	it('is hidden from screen readers', () => {
		renderFeed(NONE)({ a: ['valid-parentheses'], b: [] });
		expect(moment()?.getAttribute('aria-hidden')).toBe('true');
	});

	// The rival got there first: solving it second is not a moment.
	it('does not show when the rival already solved that question', () => {
		renderFeed({ a: [], b: ['valid-parentheses'] })({ a: ['valid-parentheses'], b: ['valid-parentheses'] });
		expect(moment()).toBeNull();
	});

	// The rival solving first is the feed line's job, not this moment's.
	it('does not show when the rival team solves a question first', () => {
		renderFeed(NONE)({ a: [], b: ['two-sum'] });
		expect(moment()).toBeNull();
	});

	// Opening the page mid-match doesn't replay old solves.
	it('does not show for questions solved before the page loaded', () => {
		renderFeed({ a: ['two-sum'], b: [] });
		expect(moment()).toBeNull();
	});

	// Less motion: no moment at all (the feed line still says it).
	it('does not show with reduced motion', () => {
		motion(true);
		renderFeed(NONE)({ a: ['valid-parentheses'], b: [] });
		expect(moment()).toBeNull();
	});

	// Smooth on any machine: only transform and opacity move.
	it('only animates transform and opacity', () => {
		const props = ['lb-first-solve', 'lb-first-slash'].flatMap((name) => keyframes(name).match(/[a-z-]+(?=\s*:)/g) ?? []);
		expect(props.length > 0 && props.every((prop) => prop === 'transform' || prop === 'opacity')).toBe(true);
	});

	// And it is switched off for reduced motion in the CSS too.
	it('turns the animations off for reduced motion', () => {
		expect(reduced).toContain('.lb-first-solve');
	});
});
