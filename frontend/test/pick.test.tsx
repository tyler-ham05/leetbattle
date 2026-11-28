// Tests for the screen where each player picks problems of their own from
// the pool left after banning (US-6-T-10, extended by US-8-2 so a player can
// claim more than one, give one back, and is capped at their own limit).
// Pseudocode these tests were written from: test/pick-test-pseudo.md
//
// The pick screen never talks to a backend in these tests: the auth context
// is a fake, the problems and picks are mocked data passed in as props, and
// the `onPick` / `onUnpick` callbacks record what the screen asked for.
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
	votes: never[];
	pickedBy: { a: TestPicker | null; b: TestPicker | null };
}

const ADA: TestPicker = { userId: 'u1', displayName: 'Ada', team: 'a' };
const GRACE: TestPicker = { userId: 'u2', displayName: 'Grace', team: 'a' };
const ALAN: TestPicker = { userId: 'u4', displayName: 'Alan', team: 'b' };

// Builds an unpicked problem. questionIds follow the list order.
function problem(questionId: number, taskId: string, topics: string[]): TestProblem {
	return { taskId, questionId, difficulty: 'Easy', topics, votes: [], pickedBy: { a: null, b: null } };
}

// The problems left after a 2v2's bans, sized so a limit of CEIL(4 / 2) = 2
// lets a player pick more than one (US-8-2) -- a plain one-each 1:1 pool
// would never exercise that.
const remaining: TestProblem[] = [
	problem(4, 'search-insert-position', ['Binary Search']),
	problem(7, 'maximum-depth-of-binary-tree', ['Tree', 'Depth-First Search']),
	problem(9, 'reverse-linked-list', ['Linked List', 'Recursion']),
	problem(11, 'merge-two-sorted-lists', ['Linked List', 'Recursion']),
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
const onUnpick = vi.fn();

// Renders the pick screen for a team of `teamSize` players (two by default,
// sharing the four-problem pool above so the limit is CEIL(4 / 2) = 2), as
// the signed-in player's own team (`myTeam`, Team 1 by default) sees it.
function renderPick(problems: TestProblem[] = remaining, teamSize = 2, myTeam: 'a' | 'b' = 'a') {
	return render(<PickScreen problems={problems} teamSize={teamSize} myTeam={myTeam} onPick={onPick} onUnpick={onUnpick} />);
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

		expect(screen.getAllByRole('listitem')).toHaveLength(4);
	});

	it('labels the questions "Question 1" to "Question 4"', () => {
		renderPick();

		expect(screen.getAllByTestId('question-label').map((label) => label.textContent))
			.toEqual(['Question 1', 'Question 2', 'Question 3', 'Question 4']);
	});

	it('shows the title of each question, derived from its taskId', () => {
		renderPick();

		// "maximum-depth-of-binary-tree" -> "Maximum Depth Of Binary Tree".
		expect(questionCard(2).textContent).toContain('Maximum Depth Of Binary Tree');
	});

	it('shows every question\'s title, not its topics', () => {
		renderPick();

		expect(screen.queryAllByTestId('topic')).toHaveLength(0);
	});
});

describe('choosing a question to pick', () => {
	it('shows "Pick this question" on every question when the player has not picked', () => {
		renderPick();

		expect(screen.getAllByRole('button', { name: /Pick this question/ })).toHaveLength(4);
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

	it('shows "Picked by you" on a question the signed-in player picked', () => {
		renderPick(withPicks({ 'search-insert-position': ADA }));

		expect(questionCard(1).textContent).toContain('Picked by you');
	});

	it('does not show "Pick this question" on a question a teammate picked', () => {
		renderPick(withPicks({ 'maximum-depth-of-binary-tree': GRACE }));

		// Question 2 is gone, so it offers no pick button (a teammate's pick isn't deselectable by Ada).
		expect(questionCard(2).querySelector('button')).toBeNull();
	});

	it('uses the primary colour for a Team 1 picker\'s name', () => {
		renderPick(withPicks({ 'maximum-depth-of-binary-tree': GRACE }), 2, 'a');

		expect(screen.getByText('Grace').className).toContain('text-primary');
	});

	it('uses the primary colour for a Team 2 picker\'s name when viewed from Team 2', () => {
		// Viewed from Team 2: Alan's pick is on team b's slot. The viewer's own
		// team is always the primary colour (US-5-T-22).
		renderPick(withPicks({ 'maximum-depth-of-binary-tree': ALAN }), 2, 'b');

		expect(screen.getByText('Alan').className).toContain('text-primary');
	});

	it('ignores a pick made by the other team on the same problem', () => {
		// Alan (Team 2) picked question 2, but Ada's own team (Team 1) hasn't.
		renderPick(withPicks({ 'maximum-depth-of-binary-tree': ALAN }), 2, 'a');

		// Viewed from Team 1, question 2 is still open to pick.
		expect(questionCard(2).querySelector('button')).not.toBeNull();
	});
});

describe('picking more than one question (US-8-2)', () => {
	it('lets a player pick a second question when they are still under their limit', async () => {
		const user = userEvent.setup();
		// Ada has picked one of the four problems; her limit is CEIL(4 / 2) = 2,
		// so she is still under it and can pick again.
		renderPick(withPicks({ 'search-insert-position': ADA }));

		await user.click(screen.getAllByRole('button', { name: /Pick this question/ })[0]);

		expect(onPick).toHaveBeenCalledWith(7);
	});

	it('shows every question the player has picked, not just the first', () => {
		renderPick(withPicks({ 'search-insert-position': ADA, 'maximum-depth-of-binary-tree': ADA }));

		expect([questionCard(1).textContent, questionCard(2).textContent].every((text) => text?.includes('Picked by you'))).toBe(true);
	});

	it('tells a player who has picked some but not all of their limit to choose another or deselect', () => {
		renderPick(withPicks({ 'search-insert-position': ADA }));

		expect(screen.getByRole('status').textContent).toBe('Choose another question, or click one of your picks to deselect it.');
	});
});

describe('the pick limit a player may select up to (US-8-2)', () => {
	it('shows no "Pick this question" once the player has reached their limit', () => {
		// Ada's limit is CEIL(4 / 2) = 2; she has reached it with two picks.
		renderPick(withPicks({ 'search-insert-position': ADA, 'maximum-depth-of-binary-tree': ADA }));

		expect(screen.queryAllByRole('button', { name: /Pick this question/ })).toHaveLength(0);
	});

	it('shows "Available" on the other questions once the player has reached their limit', () => {
		renderPick(withPicks({ 'search-insert-position': ADA, 'maximum-depth-of-binary-tree': ADA }));

		// Two questions remain open (to Ada's teammates) once she's at her limit.
		expect(screen.getAllByText('Available')).toHaveLength(2);
	});

	it('tells a player who has reached their limit that their picks are in', () => {
		renderPick(withPicks({ 'search-insert-position': ADA, 'maximum-depth-of-binary-tree': ADA }));

		expect(screen.getByRole('status').textContent).toBe('Your picks are in. Waiting for your teammates.');
	});

	it('does not let a player who has reached their limit pick a teammate\'s already-picked question either', () => {
		// Ada is at her own limit of 2; question 3 is still unpicked by anyone.
		renderPick(withPicks({ 'search-insert-position': ADA, 'maximum-depth-of-binary-tree': ADA }));

		expect(questionCard(3).querySelector('button')).toBeNull();
	});
});

describe('pick progress', () => {
	it('shows "1 of 2 picks made" when one of two teammates has picked', () => {
		renderPick(withPicks({ 'search-insert-position': ADA }), 2);

		expect(screen.getByText('1 of 2 picks made')).toBeTruthy();
	});

	it('shows "0 of 2 picks made" before anyone has picked', () => {
		renderPick(remaining, 2);

		expect(screen.getByText('0 of 2 picks made')).toBeTruthy();
	});

	it('still counts a player as one pick made even after they pick a second question', () => {
		// Ada alone has picked two of the four questions; she's still one picker.
		renderPick(withPicks({ 'search-insert-position': ADA, 'maximum-depth-of-binary-tree': ADA }), 2);

		expect(screen.getByText('1 of 2 picks made')).toBeTruthy();
	});
});

describe('deselecting a picked question (US-8-2)', () => {
	it('shows a way to deselect the question the signed-in player picked', () => {
		renderPick(withPicks({ 'search-insert-position': ADA }));

		expect(screen.getByRole('button', { name: /deselect/i })).toBeTruthy();
	});

	it('asks to give back the question when the player deselects it', async () => {
		const user = userEvent.setup();
		renderPick(withPicks({ 'search-insert-position': ADA }));

		await user.click(screen.getByRole('button', { name: /deselect/i }));

		expect(onUnpick).toHaveBeenCalledWith(4);
	});

	it('does not offer to deselect a question a teammate picked', () => {
		renderPick(withPicks({ 'maximum-depth-of-binary-tree': GRACE }));

		expect(questionCard(2).querySelector('button')).toBeNull();
	});
});
