// US-8-T-1: the ban screen is a vote. Each player votes for one question and
// can change that vote until the window closes; the bans themselves only
// appear in the reveal, after the server has resolved the vote.
// Pseudocode these tests were written from: test/ban-vote-pseudo.md
//
// The screen never talks to a backend here: the auth context is a fake, the
// pool and the ban state are mocked props, and `onVote` records what the
// screen asked for. Every count the screen shows comes from the `bans` prop,
// never from the pool's length or a player count.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// The signed-in player is u1, "Ada", on team a.
vi.mock('../app/login/context', () => ({
	useAuth: () => ({ user: { id: 'u1', name: 'Ada', email: 'ada@example.test' }, isLoading: false }),
}));

import BanScreen from '../app/game/components/ban-screen';

type TeamId = 'a' | 'b';

// One teammate's vote, as GameService sends it to that team only.
interface TestVote {
	userId: string;
	displayName: string;
}

// One question still in the pool, with the votes the viewer's own team has
// put on it.
interface TestProblem {
	taskId: string;
	questionId: number;
	difficulty: string;
	topics: string[];
	votes: TestVote[];
	pickedBy: { a: null; b: null };
}

// One question a team banned, as the reveal shows it: never who voted, and
// carrying the place it had in the pool so the reveal can show it there.
interface TestBanned {
	taskId: string;
	questionId: number;
	difficulty: string;
	topics: string[];
	team: TeamId;
	position: number;
}

const ADA: TestVote = { userId: 'u1', displayName: 'Ada' };
const GRACE: TestVote = { userId: 'u2', displayName: 'Grace' };
const KATHERINE: TestVote = { userId: 'u3', displayName: 'Katherine' };

// The eleven questions a 3v3 votes on: nine played, one per team voted off.
const openProblems: TestProblem[] = Array.from({ length: 11 }, (_, i) => ({
	taskId: `question-${i + 1}`,
	questionId: i + 1,
	difficulty: 'Easy',
	topics: ['Array'],
	votes: [],
	pickedBy: { a: null, b: null },
}));

// The ban state for a 3v3 while the votes are still open.
const openBans = {
	perTeam: 1,
	questionsInPlay: 9,
	votesCast: 0,
	voters: 3,
	revealSecondsRemaining: 0,
	banned: [] as TestBanned[],
};

// The same pool with the listed votes on the given questionIds.
function withVotes(votes: Record<number, TestVote[]>): TestProblem[] {
	return openProblems.map((problem) => ({ ...problem, votes: votes[problem.questionId] ?? [] }));
}

const onVote = vi.fn();

function renderBan(problems: TestProblem[] = openProblems, bans = openBans) {
	return render(<BanScreen problems={problems} bans={bans} myTeam="a" onVote={onVote} />);
}

// The list item for the question in the given position (1-based).
function questionCard(position: number): HTMLElement {
	return screen.getAllByRole('listitem')[position - 1];
}

// Every question the screen is still offering a vote on.
function voteButtons(): HTMLElement[] {
	return screen.queryAllByRole('button', { name: /Vote to ban/ });
}

beforeEach(() => {
	vi.clearAllMocks();
});

afterEach(() => cleanup());

describe('voting for a question to ban', () => {
	it('offers a vote on every question before the player has voted', () => {
		renderBan();

		// All eleven are open, and a vote can go on any of them.
		expect(voteButtons()).toHaveLength(11);
	});

	it('asks to vote for the question the player clicks', async () => {
		const user = userEvent.setup();
		renderBan();

		// The third question in the pool, whose questionId is 3.
		await user.click(voteButtons()[2]);

		expect(onVote).toHaveBeenCalledWith(3);
	});

	it('marks the question the player voted for as their vote', () => {
		renderBan(withVotes({ 1: [ADA] }));

		expect(questionCard(1).textContent).toContain('Your vote');
	});

	it('still offers a vote on the other questions once the player has voted', () => {
		renderBan(withVotes({ 1: [ADA] }));

		// Ada can move her vote until the window closes, so the other ten
		// questions still take one.
		expect(voteButtons()).toHaveLength(10);
	});
});

describe('the player\'s own team\'s votes', () => {
	it('names the teammates who voted for a question', () => {
		renderBan(withVotes({ 4: [GRACE, KATHERINE] }));

		expect(within(questionCard(4)).getAllByTestId('voter').map((voter) => voter.textContent))
			.toEqual(['Grace', 'Katherine']);
	});

	it('shows how many of the player\'s own team have voted', () => {
		renderBan(withVotes({ 4: [GRACE, KATHERINE] }), { ...openBans, votesCast: 2 });

		// Two of team a's three players have voted.
		expect(screen.getByText('2 of 3 votes in')).toBeTruthy();
	});
});

describe('the reveal once the window closes', () => {
	// The window has closed: team a banned question 2, team b question 5, and
	// both are out of the pool but still shown in the places they had.
	const bannedByTeams: TestBanned[] = [
		{ taskId: 'question-2', questionId: 2, difficulty: 'Easy', topics: ['Array'], team: 'a', position: 2 },
		{ taskId: 'question-5', questionId: 5, difficulty: 'Easy', topics: ['Array'], team: 'b', position: 5 },
	];
	const revealProblems = openProblems.filter((problem) => ![2, 5].includes(problem.questionId));
	const revealBans = { ...openBans, revealSecondsRemaining: 3, banned: bannedByTeams };

	it('labels a question banned by the player\'s own team with their team', () => {
		renderBan(revealProblems, revealBans);

		// Ada is on team a, which is shown to her as "Your team".
		expect(questionCard(2).textContent).toContain('Banned by Your team');
	});

	it('offers no vote on a banned question', () => {
		renderBan(revealProblems, revealBans);

		expect(questionCard(2).querySelector('button')).toBeNull();
	});
});

describe('what the screen says about the match', () => {
	it('says the match is played on the nine questions that are left', () => {
		renderBan();

		// Nine comes from the ban state, not from the pool's length.
		expect(screen.getByText(/played on the nine/)).toBeTruthy();
	});
});
