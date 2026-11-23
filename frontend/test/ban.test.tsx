// Tests for the screen where each player bans one question (issue #69), now
// that bans are real: the ban screen is a component the game page renders
// during the ban phase (see test/game.test.tsx for that wiring).
// Pseudocode these tests were written from: test/ban-test-pseudo.md
//
// The ban screen never talks to a backend in these tests: the auth context is
// a fake, the problems and bans are mocked data passed in as props, and the
// `onBan` callback records what the screen asked for.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// The signed-in player is u1, "Ada", on Team 1.
vi.mock('../app/login/context', () => ({
	useAuth: () => ({ user: { id: 'u1', name: 'Ada', email: 'ada@example.test' }, isLoading: false }),
}));

import BanScreen from '../app/game/components/ban-screen';

interface TestBanner {
	userId: string;
	displayName: string;
	team: 'a' | 'b';
}

// One problem in the match pool, as GameService sends it on `game:state`
// during the ban phase. pickedBy isn't used until the pick phase (US-6-T-10,
// see test/pick.test.tsx), but BanScreen's shared PoolProblem type requires it.
interface TestProblem {
	taskId: string;
	questionId: number;
	difficulty: string;
	topics: string[];
	bannedBy: TestBanner | null;
	pickedBy: { a: TestBanner | null; b: TestBanner | null };
}

const ADA: TestBanner = { userId: 'u1', displayName: 'Ada', team: 'a' };
const GRACE: TestBanner = { userId: 'u2', displayName: 'Grace', team: 'a' };
const ALAN: TestBanner = { userId: 'u4', displayName: 'Alan', team: 'b' };
const EDSGER: TestBanner = { userId: 'u5', displayName: 'Edsger', team: 'b' };

// Builds an open (unbanned) problem. questionIds follow the list order, 1 to 9.
function problem(questionId: number, taskId: string, topics: string[]): TestProblem {
	return { taskId, questionId, difficulty: 'Easy', topics, bannedBy: null, pickedBy: { a: null, b: null } };
}

// The match's nine problems. The taskIds are the problem names, which the
// screen must keep hidden; players only see the topics.
const openProblems: TestProblem[] = [
	problem(1, 'two-sum', ['Array', 'Hash Table']),
	problem(2, 'valid-palindrome', ['String', 'Two Pointers']),
	problem(3, 'climbing-stairs', ['Dynamic Programming']),
	problem(4, 'search-insert-position', ['Binary Search']),
	problem(5, 'number-of-islands', ['Graph', 'Breadth-First Search']),
	problem(6, 'valid-parentheses', ['Stack']),
	problem(7, 'maximum-depth-of-binary-tree', ['Tree', 'Depth-First Search']),
	problem(8, 'assign-cookies', ['Greedy', 'Sorting']),
	problem(9, 'reverse-linked-list', ['Linked List', 'Recursion']),
];

// Returns the nine problems with the listed ones (by taskId) banned by the given players.
function withBans(bans: Record<string, TestBanner>): TestProblem[] {
	return openProblems.map((entry) => ({ ...entry, bannedBy: bans[entry.taskId] ?? null }));
}

// Three other players have banned; Ada has not.
const threeBans = withBans({ 'valid-palindrome': GRACE, 'number-of-islands': EDSGER, 'maximum-depth-of-binary-tree': ALAN });

const onBan = vi.fn();

// Renders the ban screen for a match of `playerCount` players (six by default, a 3v3).
function renderBan(problems: TestProblem[] = openProblems, playerCount = 6) {
	return render(<BanScreen problems={problems} playerCount={playerCount} onBan={onBan} />);
}

// The list item for the question in the given position (1 to 9).
function questionCard(position: number): HTMLElement {
	return screen.getAllByRole('listitem')[position - 1];
}

beforeEach(() => {
	vi.clearAllMocks();
});

afterEach(() => cleanup());

describe('ban screen questions', () => {
	it('#69 shows nine questions when the match has nine questions', () => {
		renderBan();

		// Each question is one item in the question list.
		expect(screen.getAllByRole('listitem')).toHaveLength(9);
	});

	it('#69 labels the questions "Question 1" to "Question 9"', () => {
		renderBan();

		// Questions are numbered by position, never named.
		expect(screen.getAllByTestId('question-label').map((label) => label.textContent)).toEqual([
			'Question 1', 'Question 2', 'Question 3', 'Question 4', 'Question 5',
			'Question 6', 'Question 7', 'Question 8', 'Question 9',
		]);
	});

	it('#69 shows the topics of each question', () => {
		renderBan();

		// The first mocked question covers two topics.
		expect(Array.from(questionCard(1).querySelectorAll('[data-testid="topic"]')).map((topic) => topic.textContent))
			.toEqual(['Array', 'Hash Table']);
	});

	it('#69 does not show the name of a question', () => {
		renderBan();

		// "Two Sum" is the first question's name; only its topics may appear.
		expect(screen.queryByText(/two.sum/i)).toBeNull();
	});
});

describe('choosing a question to ban', () => {
	it('#69 shows "Ban this question" on every open question when the player has not banned', () => {
		renderBan(threeBans);

		// Three of the nine are already banned, leaving six the player can ban.
		expect(screen.getAllByRole('button', { name: /Ban this question/ })).toHaveLength(6);
	});

	it('#69 asks to ban a question when the player clicks its "Ban this question"', async () => {
		const user = userEvent.setup();
		renderBan();

		// The third button belongs to question 3, "climbing-stairs", whose questionId is 3.
		await user.click(screen.getAllByRole('button', { name: /Ban this question/ })[2]);

		expect(onBan).toHaveBeenCalledWith(3);
	});

	it('#69 tells a player who has not banned that they have one ban left', () => {
		renderBan();

		expect(screen.getByRole('status').textContent).toBe('You have 1 ban left. Choose a question to remove.');
	});
});

describe('banned questions', () => {
	it('#69 shows "Banned by <name>" on a question another player banned', () => {
		renderBan(withBans({ 'valid-palindrome': GRACE }));

		expect(questionCard(2).textContent).toContain('Banned by Grace');
	});

	it('#69 shows "Banned by you" on the question the signed-in player banned', () => {
		renderBan(withBans({ 'two-sum': ADA }));

		expect(questionCard(1).textContent).toContain('Banned by you');
	});

	it('#69 does not show "Ban this question" on a banned question', () => {
		renderBan(withBans({ 'valid-palindrome': GRACE }));

		// Question 2 is gone, so it offers no ban button.
		expect(questionCard(2).querySelector('button')).toBeNull();
	});

	it('#69 uses the primary colour for the name of a Team 1 player who banned', () => {
		renderBan(withBans({ 'valid-palindrome': GRACE }));

		// Grace is on Team 1, whose colour is the primary one.
		expect(screen.getByText('Grace').className).toContain('text-primary');
	});

	it('#69 uses the secondary colour for the name of a Team 2 player who banned', () => {
		renderBan(withBans({ 'number-of-islands': EDSGER }));

		// Edsger is on Team 2, whose colour is the secondary one.
		expect(screen.getByText('Edsger').className).toContain('text-secondary');
	});
});

describe('one ban per player', () => {
	it('#69 shows no "Ban this question" once the player has banned', () => {
		renderBan(withBans({ 'two-sum': ADA }));

		// Ada has used her ban, so none of the other eight can be banned by her.
		expect(screen.queryAllByRole('button', { name: /Ban this question/ })).toHaveLength(0);
	});

	it('#69 shows "Still in play" on the open questions once the player has banned', () => {
		renderBan(withBans({ 'two-sum': ADA }));

		// Eight questions remain open after Ada's ban.
		expect(screen.getAllByText('Still in play')).toHaveLength(8);
	});

	it('#69 tells a player who has banned that their ban is in', () => {
		renderBan(withBans({ 'two-sum': ADA }));

		expect(screen.getByRole('status').textContent).toBe('Your ban is in. Waiting for the other players.');
	});
});

describe('ban count', () => {
	it('#69 shows "3 of 6 bans made" when three players have banned', () => {
		// A six-player match.
		renderBan(threeBans, 6);

		expect(screen.getByText('3 of 6 bans made')).toBeTruthy();
	});

	it('shows "0 of 2 bans made" in a 1v1 before anyone has banned', () => {
		// A 1v1: two players, so two bans. The count is plain text now; the
		// marker pips were removed (US-5-T-22).
		renderBan(openProblems, 2);

		expect(screen.getByText('0 of 2 bans made')).toBeTruthy();
	});
});

describe('match size in the intro', () => {
	it('says a six-player match is played on the three questions that are left', () => {
		renderBan(openProblems, 6);

		// Nine questions, six bans: three are played.
		expect(screen.getByText(/played on the three/)).toBeTruthy();
	});

	it('says a two-player match is played on the seven questions that are left', () => {
		renderBan(openProblems, 2);

		// Nine questions, two bans: seven are played.
		expect(screen.getByText(/played on the seven/)).toBeTruthy();
	});
});
