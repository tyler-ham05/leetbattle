// Tests for the scoreboard on the match screen (issue #58, US-4-T-4).
// Pseudocode these tests were written from: test/scoreboard-test-pseudo.md
//
// No backend is touched: `useMatch` is replaced with a fake that serves mocked
// scores, timer and submissions; the timer test runs the real provider under
// fake timers. (The practice-page scoreboard test went with US-5-T-19: practice
// no longer shows the scoreboard.)
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeUser } from './helpers';

const matchMocks = vi.hoisted(() => ({ useMatch: vi.fn() }));

vi.mock('@monaco-editor/react', () => ({
	default: () => <textarea data-testid="monaco" />,
}));
vi.mock('../app/login/context', () => ({
	useAuth: () => ({ user: fakeUser, isLoading: false }),
}));
vi.mock('next/navigation', () => ({
	useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));
// Keep the real provider (the editor page and the timer test need it) but let
// most tests choose what `useMatch` returns.
vi.mock('../app/editor/match-context', async (importOriginal) => ({
	...(await importOriginal<typeof import('../app/editor/match-context')>()),
	useMatch: () => matchMocks.useMatch(),
}));

import Scoreboard from '../app/editor/components/scoreboard';

interface TestSubmission {
	id: string;
	displayName: string;
	team: 'a' | 'b';
	question: number;
	accepted: boolean;
	points: number;
}

const ADA_ACCEPTED: TestSubmission = { id: 's1', displayName: 'Ada', team: 'a', question: 3, accepted: true, points: 50 };
const ALAN_FAILED: TestSubmission = { id: 's2', displayName: 'Alan', team: 'b', question: 5, accepted: false, points: 0 };

// Renders the scoreboard with the given match data; unspecified parts get
// neutral defaults.
function renderScoreboard(match: {
	scores?: { a: number; b: number };
	secondsLeft?: number;
	submissions?: TestSubmission[];
} = {}) {
	matchMocks.useMatch.mockReturnValue({
		scores: { a: 0, b: 0 },
		secondsLeft: 600,
		submissions: [],
		...match,
	});
	return render(<Scoreboard />);
}

beforeEach(() => {
	vi.unstubAllGlobals();
	matchMocks.useMatch.mockReset();
});
afterEach(() => {
	cleanup();
	vi.useRealTimers();
});

describe('scoreboard team scores', () => {
	it('US4-Task4 shows "Team 1"', () => {
		renderScoreboard();
		expect(screen.getByText('Team 1')).toBeTruthy();
	});

	it('US4-Task4 shows "Team 2"', () => {
		renderScoreboard();
		expect(screen.getByText('Team 2')).toBeTruthy();
	});

	it('US4-Task4 shows 120 as the Team 1 score when Team 1 has 120 points', () => {
		renderScoreboard({ scores: { a: 120, b: 0 } });
		expect(screen.getByTestId('score-a').textContent).toBe('120');
	});

	it('US4-Task4 shows 80 as the Team 2 score when Team 2 has 80 points', () => {
		renderScoreboard({ scores: { a: 0, b: 80 } });
		expect(screen.getByTestId('score-b').textContent).toBe('80');
	});

	it('US4-Task4 colours the Team 1 score with the primary colour', () => {
		renderScoreboard();
		expect(screen.getByTestId('score-a').className).toContain('text-primary');
	});

	it('US4-Task4 colours the Team 2 score with the secondary colour', () => {
		renderScoreboard();
		expect(screen.getByTestId('score-b').className).toContain('text-secondary');
	});
});

describe('scoreboard match timer', () => {
	it('US4-Task4 shows 12:34 when 754 seconds are left', () => {
		renderScoreboard({ secondsLeft: 754 });
		expect(screen.getByText('12:34')).toBeTruthy();
	});

	it('US4-Task4 shows 01:05 when 65 seconds are left', () => {
		renderScoreboard({ secondsLeft: 65 });
		expect(screen.getByText('01:05')).toBeTruthy();
	});

	it('US4-Task4 shows 00:00 when no time is left', () => {
		renderScoreboard({ secondsLeft: 0 });
		expect(screen.getByText('00:00')).toBeTruthy();
	});

	it('US4-Task4 has one second less left after one second passes', async () => {
		// Use the real provider and hook, not the fake.
		const actual = await vi.importActual<typeof import('../app/editor/match-context')>(
			'../app/editor/match-context',
		);
		function Probe() {
			return <span data-testid="left">{actual.useMatch().secondsLeft}</span>;
		}
		vi.useFakeTimers();
		render(
			<actual.MatchProvider>
				<Probe />
			</actual.MatchProvider>,
		);
		const before = Number(screen.getByTestId('left').textContent);
		act(() => {
			vi.advanceTimersByTime(1000);
		});
		expect(Number(screen.getByTestId('left').textContent)).toBe(before - 1);
	});
});

// US5-Task17 (#133). Pseudocode: test/scoreboard-test-pseudo.md
// The scoreboard is one compact line: the two scores and the time left. The
// recent submissions list and the visible "Time left" label are gone (their
// US4-Task4 tests went with them).
describe('compact scoreboard', () => {
	it('US5-Task17 shows Team 1\'s score, the time left and Team 2\'s score, in that order', () => {
		renderScoreboard({ scores: { a: 120, b: 80 }, secondsLeft: 674 });
		expect(screen.getByRole('region', { name: 'Scoreboard' }).textContent).toBe('Team 112011:14Team 280');
	});

	it('US5-Task17 does not show the recent submissions list', () => {
		renderScoreboard({ submissions: [ADA_ACCEPTED, ALAN_FAILED] });
		expect(screen.queryByRole('list')).toBeNull();
	});

	it('US5-Task17 does not show "No submissions yet"', () => {
		renderScoreboard({ submissions: [] });
		expect(screen.queryByText('No submissions yet')).toBeNull();
	});

	it('US5-Task17 does not show a "Time left" label', () => {
		renderScoreboard();
		expect(screen.queryByText('Time left')).toBeNull();
	});

	it('US5-Task17 still labels the timer "Time left" for screen readers', () => {
		renderScoreboard({ secondsLeft: 674 });
		expect(screen.getByText('11:14').closest('[aria-label]')?.getAttribute('aria-label')).toBe('Time left');
	});
});
