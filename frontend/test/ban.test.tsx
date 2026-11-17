// Tests for the screen where each player bans one question (issue #69).
// Pseudocode these tests were written from: test/ban-test-pseudo.md
//
// The ban screen never talks to a backend in these tests: the auth context and
// the ban context are both replaced with fakes, the questions and bans are
// mocked data, and `ban` records what the page asked for.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const banMocks = vi.hoisted(() => ({
	useBan: vi.fn(),
	ban: vi.fn(),
	// The router's push, so tests can see where the player was sent.
	push: vi.fn(),
}));

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: banMocks.push, replace: vi.fn() }) }));
// The signed-in player is u1, "Ada", on Team 1.
vi.mock('../app/login/context', () => ({
	useAuth: () => ({ user: { id: 'u1', name: 'Ada', email: 'ada@example.test' }, isLoading: false }),
}));
vi.mock('../app/ban/context', () => ({ useBan: () => banMocks.useBan() }));

import BanPage from '../app/ban/page';

interface TestBanner {
	userId: string;
	displayName: string;
	team: 'a' | 'b';
}

interface TestQuestion {
	id: string;
	topics: string[];
	bannedBy: TestBanner | null;
}

const ADA: TestBanner = { userId: 'u1', displayName: 'Ada', team: 'a' };
const GRACE: TestBanner = { userId: 'u2', displayName: 'Grace', team: 'a' };
const ALAN: TestBanner = { userId: 'u4', displayName: 'Alan', team: 'b' };
const EDSGER: TestBanner = { userId: 'u5', displayName: 'Edsger', team: 'b' };

// The match's nine questions. The ids are the question names, which the
// screen must keep hidden; players only see the topics.
const openQuestions: TestQuestion[] = [
	{ id: 'two-sum', topics: ['Array', 'Hash Table'], bannedBy: null },
	{ id: 'valid-palindrome', topics: ['String', 'Two Pointers'], bannedBy: null },
	{ id: 'climbing-stairs', topics: ['Dynamic Programming'], bannedBy: null },
	{ id: 'search-insert-position', topics: ['Binary Search'], bannedBy: null },
	{ id: 'number-of-islands', topics: ['Graph', 'Breadth-First Search'], bannedBy: null },
	{ id: 'valid-parentheses', topics: ['Stack'], bannedBy: null },
	{ id: 'maximum-depth-of-binary-tree', topics: ['Tree', 'Depth-First Search'], bannedBy: null },
	{ id: 'assign-cookies', topics: ['Greedy', 'Sorting'], bannedBy: null },
	{ id: 'reverse-linked-list', topics: ['Linked List', 'Recursion'], bannedBy: null },
];

// Returns the nine questions with the listed ones banned by the given players.
function withBans(bans: Record<string, TestBanner>): TestQuestion[] {
	return openQuestions.map((entry) => ({ ...entry, bannedBy: bans[entry.id] ?? null }));
}

// Three other players have banned; Ada has not.
const threeBans = withBans({ 'valid-palindrome': GRACE, 'number-of-islands': EDSGER, 'maximum-depth-of-binary-tree': ALAN });

// Sets the questions useBan returns for the next render.
function configureBan(questions: TestQuestion[] = openQuestions) {
	banMocks.useBan.mockReturnValue({ questions, ban: banMocks.ban });
}

// The list item for the question in the given position (1 to 9).
function questionCard(position: number): HTMLElement {
	return screen.getAllByRole('listitem')[position - 1];
}

beforeEach(() => {
	vi.clearAllMocks();
	configureBan();
});

afterEach(() => cleanup());

describe('ban screen questions', () => {
	it('#69 shows nine questions when the match has nine questions', () => {
		render(<BanPage />);

		// Each question is one item in the question list.
		expect(screen.getAllByRole('listitem')).toHaveLength(9);
	});

	it('#69 labels the questions "Question 1" to "Question 9"', () => {
		render(<BanPage />);

		// Questions are numbered by position, never named.
		expect(screen.getAllByTestId('question-label').map((label) => label.textContent)).toEqual([
			'Question 1', 'Question 2', 'Question 3', 'Question 4', 'Question 5',
			'Question 6', 'Question 7', 'Question 8', 'Question 9',
		]);
	});

	it('#69 shows the topics of each question', () => {
		render(<BanPage />);

		// The first mocked question covers two topics.
		expect(Array.from(questionCard(1).querySelectorAll('[data-testid="topic"]')).map((topic) => topic.textContent))
			.toEqual(['Array', 'Hash Table']);
	});

	it('#69 does not show the name of a question', () => {
		render(<BanPage />);

		// "Two Sum" is the first question's name; only its topics may appear.
		expect(screen.queryByText(/two.sum/i)).toBeNull();
	});
});

describe('choosing a question to ban', () => {
	it('#69 shows "Ban this question" on every open question when the player has not banned', () => {
		configureBan(threeBans);
		render(<BanPage />);

		// Three of the nine are already banned, leaving six the player can ban.
		expect(screen.getAllByRole('button', { name: /Ban this question/ })).toHaveLength(6);
	});

	it('#69 asks to ban a question when the player clicks its "Ban this question"', async () => {
		const user = userEvent.setup();
		render(<BanPage />);

		// The third button belongs to question 3, "climbing-stairs".
		await user.click(screen.getAllByRole('button', { name: /Ban this question/ })[2]);

		expect(banMocks.ban).toHaveBeenCalledWith('climbing-stairs');
	});

	it('#69 tells a player who has not banned that they have one ban left', () => {
		render(<BanPage />);

		expect(screen.getByRole('status').textContent).toBe('You have 1 ban left. Choose a question to remove.');
	});
});

describe('banned questions', () => {
	it('#69 shows "Banned by <name>" on a question another player banned', () => {
		configureBan(withBans({ 'valid-palindrome': GRACE }));
		render(<BanPage />);

		expect(questionCard(2).textContent).toContain('Banned by Grace');
	});

	it('#69 shows "Banned by you" on the question the signed-in player banned', () => {
		configureBan(withBans({ 'two-sum': ADA }));
		render(<BanPage />);

		expect(questionCard(1).textContent).toContain('Banned by you');
	});

	it('#69 does not show "Ban this question" on a banned question', () => {
		configureBan(withBans({ 'valid-palindrome': GRACE }));
		render(<BanPage />);

		// Question 2 is gone, so it offers no ban button.
		expect(questionCard(2).querySelector('button')).toBeNull();
	});

	it('#69 uses the primary colour for the name of a Team 1 player who banned', () => {
		configureBan(withBans({ 'valid-palindrome': GRACE }));
		render(<BanPage />);

		// Grace is on Team 1, whose colour is the primary one.
		expect(screen.getByText('Grace').className).toContain('text-primary');
	});

	it('#69 uses the secondary colour for the name of a Team 2 player who banned', () => {
		configureBan(withBans({ 'number-of-islands': EDSGER }));
		render(<BanPage />);

		// Edsger is on Team 2, whose colour is the secondary one.
		expect(screen.getByText('Edsger').className).toContain('text-secondary');
	});
});

describe('one ban per player', () => {
	it('#69 shows no "Ban this question" once the player has banned', () => {
		configureBan(withBans({ 'two-sum': ADA }));
		render(<BanPage />);

		// Ada has used her ban, so none of the other eight can be banned by her.
		expect(screen.queryAllByRole('button', { name: /Ban this question/ })).toHaveLength(0);
	});

	it('#69 shows "Still in play" on the open questions once the player has banned', () => {
		configureBan(withBans({ 'two-sum': ADA }));
		render(<BanPage />);

		// Eight questions remain open after Ada's ban.
		expect(screen.getAllByText('Still in play')).toHaveLength(8);
	});

	it('#69 tells a player who has banned that their ban is in', () => {
		configureBan(withBans({ 'two-sum': ADA }));
		render(<BanPage />);

		expect(screen.getByRole('status').textContent).toBe('Your ban is in. Waiting for the other players.');
	});
});

describe('ban count', () => {
	it('#69 shows "3 of 6 bans made" when three players have banned', () => {
		configureBan(threeBans);
		render(<BanPage />);

		expect(screen.getByText('3 of 6 bans made')).toBeTruthy();
	});

	it('#69 always shows six ban markers', () => {
		const { container } = render(<BanPage />);

		// One marker per player, filled or not.
		expect(container.querySelectorAll('[data-seat]')).toHaveLength(6);
	});

	it('#69 marks two ban markers for Team 2 when two Team 2 players have banned', () => {
		configureBan(threeBans);
		const { container } = render(<BanPage />);

		// Alan and Edsger are the Team 2 players who banned.
		expect(container.querySelectorAll('[data-seat="b"]')).toHaveLength(2);
	});
});

// Issue #95: the ban screen flow.
const GEORGE: TestBanner = { userId: 'u6', displayName: 'George', team: 'b' };
const HOPPER: TestBanner = { userId: 'u3', displayName: 'Hopper', team: 'a' };

// Five players have banned; Ada is one of them.
const fiveBans = withBans({
	'two-sum': ADA,
	'valid-palindrome': GRACE,
	'number-of-islands': EDSGER,
	'maximum-depth-of-binary-tree': ALAN,
	'assign-cookies': HOPPER,
});
// Every player has banned.
const sixBans = withBans({
	'two-sum': ADA,
	'valid-palindrome': GRACE,
	'number-of-islands': EDSGER,
	'maximum-depth-of-binary-tree': ALAN,
	'assign-cookies': HOPPER,
	'reverse-linked-list': GEORGE,
});

describe('Issue95 ban flow', () => {
	it('Issue95 shows "Banned by you" on a sample question after the player clicks "Ban this question"', async () => {
		// Use the real provider (sample questions, local state) instead of the fake.
		// The file's mocked auth context signs in Ada (u1, the same id as fakeUser).
		const actual = await vi.importActual<typeof import('../app/ban/context')>('../app/ban/context');
		banMocks.useBan.mockImplementation(actual.useBan);
		const user = userEvent.setup();
		render(<actual.BanProvider><BanPage /></actual.BanProvider>);

		await user.click(screen.getAllByRole('button', { name: /Ban this question/ })[0]);

		// Ada is the signed-in player, so her own ban reads "you".
		expect(questionCard(1).textContent).toContain('Banned by you');
	});

	it('Issue95 shows "All bans are in" when six players have banned', () => {
		configureBan(sixBans);
		render(<BanPage />);

		expect(screen.getByRole('status').textContent).toContain('All bans are in');
	});

	it('Issue95 sends the player to the editor when six players have banned', () => {
		configureBan(sixBans);
		render(<BanPage />);

		expect(banMocks.push).toHaveBeenCalledWith('/editor');
	});

	it('Issue95 does not send the player to the editor when five players have banned', () => {
		configureBan(fiveBans);
		render(<BanPage />);

		// One ban is still missing, so the player stays on the ban screen.
		expect(banMocks.push).not.toHaveBeenCalled();
	});
});
