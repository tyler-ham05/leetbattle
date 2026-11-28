// US-4-T-6: Live score feed and per-question result breakdown (US-4, #42).
// Pseudocode these tests were written from: test/score-feed-test-pseudo.md
//
// - The match top bar's score bumps (0.97 -> 1, transform only) when it goes up
// - A new solve shows "<Team> solved Q<n>" under the top bar for 4 seconds,
//   in the team's color, announced politely; newer lines replace older ones
// - The result screen lists every question in the pool and which teams solved it
//
// No backend is touched: the components get plain props, the game page's
// socket context and auth are replaced with fakes, CodeService's fetch is
// stubbed and Monaco is swapped for a textarea.
import fs from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen, within } from '@testing-library/react';
import { fakeUser, jsonResponse, makeProblem, stubFetch } from './helpers';

const gameMocks = vi.hoisted(() => ({ useGameSocket: vi.fn() }));

vi.mock('@monaco-editor/react', () => ({
	default: ({ value }: { value: string }) => <textarea data-testid="monaco" value={value} readOnly />,
}));
vi.mock('socket.io-client', () => ({ io: vi.fn() }));
vi.mock('next/navigation', () => ({
	useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
	useParams: () => ({ gameId: 'game-1' }),
}));
vi.mock('../app/login/context', () => ({ useAuth: () => ({ user: fakeUser, isLoading: false }) }));
vi.mock('../app/game/socket-context', () => ({
	GameSocketProvider: ({ children }: { children: React.ReactNode }) => children,
	useGameSocket: () => gameMocks.useGameSocket(),
}));

import { ScoreLine } from '../app/editor/components/scoreboard';
import ScoreFeed from '../app/game/components/score-feed';
import ResultScreen from '../app/game/components/result-screen';
import GamePage from '../app/game/[gameId]/page';

const css = fs.readFileSync(path.resolve(__dirname, '../app/globals.css'), 'utf8');
// The prefers-reduced-motion block(s) in globals.css, joined.
const reduced = css.split('@media (prefers-reduced-motion: reduce)').slice(1).join('\n');
// The body of one @keyframes block, by name.
const keyframes = (name: string) => css.match(new RegExp(`@keyframes ${name}\\s*\\{((?:[^{}]*\\{[^}]*\\})*)[^}]*\\}`))?.[1] ?? '';

// The match pool after the bans, as GameService sends it: Q1, Q2, Q3 in order.
const pool = [
	{ taskId: 'two-sum', questionId: 1, difficulty: 'Easy', topics: [], votes: [], pickedBy: { a: null, b: null } },
	{ taskId: 'valid-parentheses', questionId: 2, difficulty: 'Easy', topics: [], votes: [], pickedBy: { a: null, b: null } },
	{ taskId: 'best-time-to-buy-and-sell-stock', questionId: 3, difficulty: 'Medium', topics: [], votes: [], pickedBy: { a: null, b: null } },
];

const NONE = { a: [] as string[], b: [] as string[] };
const LINE = /solved Q/;

// The signed-in user (u1) plays on team a.
const roster = [
	{ userId: 'u1', displayName: 'Ada', team: 'a', connected: true },
	{ userId: 'u4', displayName: 'Alan', team: 'b', connected: true },
];

beforeEach(() => {
	vi.unstubAllGlobals();
	// jsdom has no matchMedia: motion is not reduced (the result screen's count-up reads it).
	vi.stubGlobal('matchMedia', (query: string) => ({ matches: false, media: query, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
});
afterEach(() => {
	cleanup();
	vi.useRealTimers();
});

describe('score bump', () => {
	// Renders the top bar's score line for a player on team a, then returns a
	// function that re-renders it with new scores.
	function renderLine(scores: { a: number; b: number }) {
		const view = render(<ScoreLine scores={scores} myTeam="a" time="20:00" />);
		return (next: { a: number; b: number }) => view.rerender(<ScoreLine scores={next} myTeam="a" time="20:00" />);
	}

	it('US-4-T-6 does not bump a score when the page first shows it', () => {
		renderLine({ a: 100, b: 0 });
		expect(screen.getByTestId('score-a').className).not.toContain('lb-score-bump');
	});

	it('US-4-T-6 bumps Your team\'s score when it goes up', () => {
		const update = renderLine({ a: 0, b: 0 });
		update({ a: 50, b: 0 });
		expect(screen.getByTestId('score-a').className).toContain('lb-score-bump');
	});

	it('US-4-T-6 does not bump the Rival team\'s score when only Your team\'s goes up', () => {
		const update = renderLine({ a: 0, b: 0 });
		update({ a: 50, b: 0 });
		expect(screen.getByTestId('score-b').className).not.toContain('lb-score-bump');
	});

	it('US-4-T-6 does not bump a score that stays the same on a new game state', () => {
		const update = renderLine({ a: 50, b: 0 });
		// A new object with the same numbers, as every game:state sends.
		update({ a: 50, b: 0 });
		expect(screen.getByTestId('score-a').className).not.toContain('lb-score-bump');
	});

	it('US-4-T-6 starts the bump keyframes at scale 0.97', () => {
		expect(keyframes('lb-score-bump')).toMatch(/^\s*(from|0%)\s*\{\s*transform:\s*scale\(0\.97\);?\s*\}/);
	});

	it('US-4-T-6 only animates transform in the bump keyframes', () => {
		// Every declaration inside the keyframes is a transform.
		expect(keyframes('lb-score-bump').match(/[a-z-]+(?=\s*:)/g)?.every((prop) => prop === 'transform')).toBe(true);
	});

	it('US-4-T-6 turns the bump off with reduced motion', () => {
		expect(reduced).toContain('.lb-score-bump');
	});
});

describe('score feed', () => {
	// Renders the feed for a viewer on myTeam with what was solved at page
	// load, and returns a function that sends a newer game state's solved
	// lists. null stands for someone who is not a player (no team).
	function renderFeed(solved: { a: string[]; b: string[] }, team: 'a' | 'b' | null = 'a') {
		const myTeam = team ?? undefined;
		const view = render(<ScoreFeed pool={pool} solved={solved} myTeam={myTeam} />);
		return (next: { a: string[]; b: string[] }) => view.rerender(<ScoreFeed pool={pool} solved={next} myTeam={myTeam} />);
	}

	it('US-4-T-6 shows no line for questions solved before the page loaded', () => {
		renderFeed({ a: ['two-sum'], b: ['valid-parentheses'] });
		expect(screen.queryByText(LINE)).toBeNull();
	});

	it('US-4-T-6 shows "Your team solved Q2" when Your team newly solves the second question', () => {
		const update = renderFeed(NONE);
		update({ a: ['valid-parentheses'], b: [] });
		expect(screen.getByText('Your team solved Q2')).toBeTruthy();
	});

	it('US-4-T-6 shows "Rival team solved Q1" when the Rival team newly solves the first question', () => {
		const update = renderFeed(NONE);
		update({ a: [], b: ['two-sum'] });
		expect(screen.getByText('Rival team solved Q1')).toBeTruthy();
	});

	it('US-4-T-6 colors a Your team line with the primary color', () => {
		const update = renderFeed(NONE);
		update({ a: ['two-sum'], b: [] });
		expect(screen.getByText('Your team solved Q1').className).toContain('text-primary');
	});

	it('US-4-T-6 colors a Rival team line with the secondary color', () => {
		const update = renderFeed(NONE);
		update({ a: [], b: ['two-sum'] });
		expect(screen.getByText('Rival team solved Q1').className).toContain('text-secondary');
	});

	it('US-4-T-6 announces the line politely', () => {
		const update = renderFeed(NONE);
		update({ a: ['two-sum'], b: [] });
		expect(screen.getByText('Your team solved Q1').closest('[aria-live]')?.getAttribute('aria-live')).toBe('polite');
	});

	it('US-4-T-6 replaces the older line with a newer solve, so one line shows', () => {
		const update = renderFeed(NONE);
		update({ a: ['two-sum'], b: [] });
		update({ a: ['two-sum'], b: ['valid-parentheses'] });
		expect(screen.getAllByText(LINE).map((line) => line.textContent)).toEqual(['Rival team solved Q2']);
	});

	it('US-4-T-6 still shows the line just before 4 seconds have passed', () => {
		vi.useFakeTimers();
		const update = renderFeed(NONE);
		update({ a: ['two-sum'], b: [] });
		act(() => {
			vi.advanceTimersByTime(3999);
		});
		expect(screen.queryByText('Your team solved Q1')).not.toBeNull();
	});

	it('US-4-T-6 removes the line once 4 seconds have passed', () => {
		vi.useFakeTimers();
		const update = renderFeed(NONE);
		update({ a: ['two-sum'], b: [] });
		act(() => {
			vi.advanceTimersByTime(4000);
		});
		expect(screen.queryByText(LINE)).toBeNull();
	});

	it('US-4-T-6 shows "Team 2 solved Q3" to someone who is not a player', () => {
		const update = renderFeed(NONE, null);
		update({ a: [], b: ['best-time-to-buy-and-sell-stock'] });
		expect(screen.getByText('Team 2 solved Q3')).toBeTruthy();
	});

	it('US-4-T-6 turns the line\'s entrance off with reduced motion', () => {
		expect(reduced).toContain('.lb-feed-in');
	});
});

describe('result breakdown', () => {
	// The end of a match the user's team (a) won, where team a solved Q1 and
	// Q2, and team b solved Q2.
	function renderResult() {
		render(
			<ResultScreen
				result={{ winner: 'a', reason: 'time' }}
				myTeam="a"
				scores={{ a: 200, b: 100 }}
				players={[]}
				pool={pool}
				solved={{ a: ['two-sum', 'valid-parentheses'], b: ['valid-parentheses'] }}
			/>,
		);
		return screen.getByRole('table', { name: 'Questions' });
	}

	// The "Your team" and "Rival team" cells of one question's row, in order.
	const cellsOf = (question: string) => within(screen.getByRole('rowheader', { name: question }).closest('tr') as HTMLElement).getAllByRole('cell');

	it('US-4-T-6 has one row per question in the pool', () => {
		const table = renderResult();
		expect(within(table).getAllByRole('rowheader')).toHaveLength(3);
	});

	it('US-4-T-6 names a question\'s row by its position and title, "Q1 Two Sum"', () => {
		renderResult();
		expect(screen.getAllByRole('rowheader')[0].textContent).toBe('Q1 Two Sum');
	});

	it('US-4-T-6 has "Your team" then "Rival team" columns', () => {
		const table = renderResult();
		expect(within(table).getAllByRole('columnheader').slice(1).map((header) => header.textContent)).toEqual(['Your team', 'Rival team']);
	});

	it('US-4-T-6 shows "Solved" in Your team\'s column for a question Your team solved', () => {
		renderResult();
		expect(cellsOf('Q1 Two Sum')[0].textContent).toBe('Solved');
	});

	it('US-4-T-6 colors Your team\'s "Solved" with the primary color', () => {
		renderResult();
		expect(cellsOf('Q2 Valid Parentheses')[0].className).toContain('text-primary');
	});

	it('US-4-T-6 colors the Rival team\'s "Solved" with the secondary color', () => {
		renderResult();
		expect(cellsOf('Q2 Valid Parentheses')[1].className).toContain('text-secondary');
	});

	it('US-4-T-6 shows "–" for a question a team did not solve', () => {
		renderResult();
		expect(cellsOf('Q1 Two Sum')[1].textContent).toBe('–');
	});

	it('US-4-T-6 shows "–" in muted text', () => {
		renderResult();
		expect(cellsOf('Q3 Best Time To Buy And Sell Stock')[0].className).toContain('text-muted');
	});

	it('US-4-T-6 brings the breakdown in after the halves', () => {
		const table = renderResult();
		// The halves rise in at 1.55s; the breakdown's own delay is later.
		const rise = table.closest('.lb-result-rise') as HTMLElement | null;
		expect(parseFloat(rise?.style.getPropertyValue('--d') ?? '0')).toBeGreaterThan(1.55);
	});
});

describe('game page wiring', () => {
	// The page's socket context: connected, with the given game state and result.
	function configureGame(game: Record<string, unknown>, result: unknown = null) {
		gameMocks.useGameSocket.mockReturnValue({
			socket: { connected: true, emit: vi.fn(), on: vi.fn(), off: vi.fn() },
			connected: result === null,
			game: {
				gameId: 'game-1',
				phase: 'playing',
				startedAt: Date.now(),
				secondsRemaining: 1200,
				scores: { a: 0, b: 0 },
				problemPool: pool,
				players: roster,
				forfeitVotes: { a: 0, b: 0 },
				solved: NONE,
				...game,
			},
			result,
			error: null,
			connect: vi.fn(),
			clearError: vi.fn(),
			forfeit: vi.fn(),
			ban: vi.fn(),
			pick: vi.fn(),
			submit: vi.fn(),
			shareCode: vi.fn(),
			teammateCode: {},
		});
	}

	beforeEach(() => {
		// Stands in for CodeService: every problem the editor asks for.
		stubFetch((url) => jsonResponse(makeProblem(Number(url.split('/').pop()), 'Easy')));
	});

	it('US-4-T-6 shows "Your team solved Q2" during a match when a new game state says so', () => {
		configureGame({});
		const { rerender } = render(<GamePage />);
		configureGame({ solved: { a: ['valid-parentheses'], b: [] } });
		rerender(<GamePage />);
		expect(screen.getByText('Your team solved Q2')).toBeTruthy();
	});

	it('US-4-T-6 lists the match\'s questions on the result screen', () => {
		configureGame({ solved: { a: ['two-sum'], b: [] } }, { winner: 'a', reason: 'time' });
		render(<GamePage />);
		expect(screen.getAllByRole('rowheader').map((row) => row.textContent)).toEqual(['Q1 Two Sum', 'Q2 Valid Parentheses', 'Q3 Best Time To Buy And Sell Stock']);
	});
});
