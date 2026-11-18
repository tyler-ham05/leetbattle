// Tests for the screen where each player picks one of the problems left
// after banning (US-6-T-10): the pick screen is a component the game page
// renders during a "picking" phase (see test/game.test.tsx for that wiring).
// Modelled closely on test/ban.test.tsx.
//
// Picks are per team: a problem can be picked by one player per team
// independently of the other team, so this screen only ever shows and only
// ever blocks on the signed-in player's own team's picks (myTeam).
//
// The pick screen never talks to a backend in these tests: the auth context
// is a fake, the problems and picks are mocked data passed in as props, and
// the `onPick` callback records what the screen asked for.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// The signed-in player is u1, "Ada", on Team 1.
vi.mock('../app/login/context', () => ({
	useAuth: () => ({ user: { id: 'u1', name: 'Ada', email: 'ada@example.test' }, isLoading: false }),
}));

import PickScreen from '../app/game/components/pick-screen';

interface TestPicker {
	userId: string;
	displayName: string;
	team: 'a' | 'b';
}

// One problem left to pick from, as GameService sends it on `game:state`
// during the pick phase: one picker slot per team, independent of the other.
interface TestProblem {
	taskId: string;
	questionId: number;
	difficulty: string;
	topics: string[];
	pickedBy: { a: TestPicker | null; b: TestPicker | null };
}

const ADA: TestPicker = { userId: 'u1', displayName: 'Ada', team: 'a' };
const GRACE: TestPicker = { userId: 'u2', displayName: 'Grace', team: 'a' };
const ALAN: TestPicker = { userId: 'u4', displayName: 'Alan', team: 'b' };

// Builds an unpicked problem. questionIds follow the list order.
function problem(questionId: number, taskId: string, topics: string[]): TestProblem {
	return { taskId, questionId, difficulty: 'Easy', topics, pickedBy: { a: null, b: null } };
}

// The three problems left after a 3v3's bans: one each, if every teammate picks.
const remaining: TestProblem[] = [
	problem(4, 'search-insert-position', ['Binary Search']),
	problem(7, 'maximum-depth-of-binary-tree', ['Tree', 'Depth-First Search']),
	problem(9, 'reverse-linked-list', ['Linked List', 'Recursion']),
];

// Returns `remaining` with the listed ones (by taskId) picked by the given
// players on their own team's slot.
function withPicks(picks: Record<string, TestPicker>): TestProblem[] {
	return remaining.map((entry) => {
		const picker = picks[entry.taskId];
		if (!picker) return entry;
		return { ...entry, pickedBy: { ...entry.pickedBy, [picker.team]: picker } };
	});
}

const onPick = vi.fn();

// Renders the pick screen for a team of `teamSize` players (three by default,
// one third of a 3v3), as the signed-in player's own team (`myTeam`, Team 1
// by default) sees it.
function renderPick(problems: TestProblem[] = remaining, teamSize = 3, myTeam: 'a' | 'b' = 'a') {
	return render(<PickScreen problems={problems} teamSize={teamSize} myTeam={myTeam} onPick={onPick} />);
}

// The list item for the question in the given position (1-based).
function questionCard(position: number): HTMLElement {
	return screen.getAllByRole('listitem')[position - 1];
}

beforeEach(() => {
	vi.clearAllMocks();
});

afterEach(() => cleanup());

describe('pick screen questions', () => {
	it('shows one question per problem left after banning', () => {
		renderPick();

		expect(screen.getAllByRole('listitem')).toHaveLength(3);
	});

	it('labels the questions "Question 1" to "Question 3"', () => {
		renderPick();

		expect(screen.getAllByTestId('question-label').map((label) => label.textContent))
			.toEqual(['Question 1', 'Question 2', 'Question 3']);
	});

	it('shows the topics of each question', () => {
		renderPick();

		// The second mocked question covers two topics.
		expect(Array.from(questionCard(2).querySelectorAll('[data-testid="topic"]')).map((topic) => topic.textContent))
			.toEqual(['Tree', 'Depth-First Search']);
	});

	it('does not show the name of a question', () => {
		renderPick();

		// "Reverse Linked List" is the third question's name; only its topics may appear.
		expect(screen.queryByText(/reverse.linked.list/i)).toBeNull();
	});
});

describe('choosing a question to pick', () => {
	it('shows "Pick this question" on every question when the player has not picked', () => {
		renderPick();

		expect(screen.getAllByRole('button', { name: /Pick this question/ })).toHaveLength(3);
	});

	it('asks to pick a question when the player clicks its "Pick this question"', async () => {
		const user = userEvent.setup();
		renderPick();

		// The second button belongs to question 2, "maximum-depth-of-binary-tree", questionId 7.
		await user.click(screen.getAllByRole('button', { name: /Pick this question/ })[1]);

		expect(onPick).toHaveBeenCalledWith(7);
	});

	it('tells a player who has not picked to choose a question', () => {
		renderPick();

		expect(screen.getByRole('status').textContent).toBe('Choose a question to work on.');
	});
});

describe('picked questions', () => {
	it('shows "Picked by <name>" on a question a teammate picked', () => {
		renderPick(withPicks({ 'maximum-depth-of-binary-tree': GRACE }));

		expect(questionCard(2).textContent).toContain('Picked by Grace');
	});

	it('shows "Picked by you" on the question the signed-in player picked', () => {
		renderPick(withPicks({ 'search-insert-position': ADA }));

		expect(questionCard(1).textContent).toContain('Picked by you');
	});

	it('does not show "Pick this question" on a question a teammate picked', () => {
		renderPick(withPicks({ 'maximum-depth-of-binary-tree': GRACE }));

		// Question 2 is gone, so it offers no pick button.
		expect(questionCard(2).querySelector('button')).toBeNull();
	});

	it('uses the primary colour for a Team 1 picker\'s name', () => {
		renderPick(withPicks({ 'maximum-depth-of-binary-tree': GRACE }), 3, 'a');

		expect(screen.getByText('Grace').className).toContain('text-primary');
	});

	it('uses the secondary colour for a Team 2 picker\'s name', () => {
		// Viewed from Team 2: Alan's pick is on team b's slot.
		renderPick(withPicks({ 'maximum-depth-of-binary-tree': ALAN }), 3, 'b');

		expect(screen.getByText('Alan').className).toContain('text-secondary');
	});

	it('ignores a pick made by the other team on the same problem', () => {
		// Alan (Team 2) picked question 2, but Ada's own team (Team 1) hasn't.
		renderPick(withPicks({ 'maximum-depth-of-binary-tree': ALAN }), 3, 'a');

		// Viewed from Team 1, question 2 is still open to pick.
		expect(questionCard(2).querySelector('button')).not.toBeNull();
	});
});

describe('one pick per player', () => {
	it('shows no "Pick this question" once the player has picked', () => {
		renderPick(withPicks({ 'search-insert-position': ADA }));

		// Ada has used her pick, so none of the other two can be picked by her.
		expect(screen.queryAllByRole('button', { name: /Pick this question/ })).toHaveLength(0);
	});

	it('shows "Available" on the other questions once the player has picked', () => {
		renderPick(withPicks({ 'search-insert-position': ADA }));

		// Two questions remain open (to Ada's teammates) after her pick.
		expect(screen.getAllByText('Available')).toHaveLength(2);
	});

	it('tells a player who has picked that their pick is in', () => {
		renderPick(withPicks({ 'search-insert-position': ADA }));

		expect(screen.getByRole('status').textContent).toBe('Your pick is in. Waiting for your teammates.');
	});
});

describe('pick count', () => {
	it('shows "1 of 3 picks made" when one teammate has picked', () => {
		renderPick(withPicks({ 'search-insert-position': ADA }), 3);

		expect(screen.getByText('1 of 3 picks made')).toBeTruthy();
	});

	it('shows one pick marker per teammate', () => {
		// A 2v2's team of two.
		const { container } = renderPick(remaining.slice(0, 2), 2);

		expect(container.querySelectorAll('[data-seat]')).toHaveLength(2);
	});

	it('marks one pick marker as filled once a teammate has picked', () => {
		const { container } = renderPick(withPicks({ 'search-insert-position': ADA }), 3);

		expect(container.querySelectorAll('[data-seat="a"]')).toHaveLength(1);
	});
});
