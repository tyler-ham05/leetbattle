// US5-Task19: practice and match layout (UI only; CodeService fetch, the game socket and Monaco are mocked, no backend)

// Practice page has no match parts
//  - The practice page should not show "Team 1"
//  - The practice page should not show "Team 2"
//  - The practice page should not show a "Time left" timer
//  - The practice page should not show a "Team chat" panel

// Only the first three test cases are visible
//  - A problem with 15 test cases should show a "Case 1" tab
//  - A problem with 15 test cases should show a "Case 3" tab
//  - A problem with 15 test cases should not show a "Case 4" tab
//  - A problem with 15 test cases should show "+12 hidden, run on submit"
//  - A problem with 2 test cases should show a "Case 2" tab
//  - A problem with 2 test cases should not show "hidden, run on submit"
//  - Clicking "Run" on a problem with 15 test cases should send only the first 3 cases to CodeService
//  - Clicking "Submit" in practice should still send only the code and question id (CodeService runs every case)

// The match fills the page while playing
//  - While playing, the "Match" heading should not be shown
//  - While playing, the "Team 1 players" list should not be shown
//  - While playing, the "Team 2 players" list should not be shown
//  - While banning, the "Team 1 players" list should still be shown

// Score and time sit in the middle of the top bar while playing
//  - The top bar should show "Your team" (was "Team 1", sprint 4 polish)
//  - The top bar should show "Rival team" (was "Team 2", sprint 4 polish)
//  - With scores of 120 to 80, the top bar should show "120" for Team 1
//  - With scores of 120 to 80, the top bar should show "80" for Team 2
//  - With 754 seconds left, the top bar should show "12:34"
//  - The top bar should still show the "Forfeit" button

// Teammate tabs show who is disconnected
//  - A connected teammate's tab should not be labelled "disconnected"
//  - A disconnected teammate's tab should be labelled "<name>, disconnected" for screen readers
//  - A disconnected teammate's tab should be faded
//  - A disconnected teammate's tab should show the disconnected (crossed-out wifi) icon
//  - A disconnected teammate's tab should still open their read-only code when clicked
//  - When a disconnected teammate reconnects, their tab should no longer be faded

// Viewing a teammate's code
//  - Viewing Grace's code should show "Grace's code, read only" in the code tab bar
//  - Viewing Grace's code should not show the "Viewing Grace's workspace (read only)" banner

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fakeUser, jsonResponse, makeProblem, requestsOf, stubFetch } from './helpers';

// The game page never talks to GameService here: its socket context is a fake
// whose return value each test sets through configureGame().
const gameMocks = vi.hoisted(() => ({ useGameSocket: vi.fn() }));

// Monaco needs a real browser; a textarea with the same contract stands in.
// It mirrors options.readOnly so a teammate's read-only view can be checked.
vi.mock('@monaco-editor/react', () => ({
	default: ({ value, onChange, options }: { value: string; onChange?: (_v: string) => void; options?: { readOnly?: boolean } }) => (
		<textarea data-testid="monaco" value={value} readOnly={options?.readOnly} onChange={(e) => onChange?.(e.target.value)} />
	),
}));
// No test may open a real socket: io() hands back an inert fake.
vi.mock('socket.io-client', () => ({
	io: () => ({ connected: false, connect: vi.fn(), disconnect: vi.fn(), on: vi.fn(), off: vi.fn(), emit: vi.fn() }),
}));
vi.mock('next/navigation', () => ({
	useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
	useParams: () => ({ gameId: 'game-1' }),
}));
// Both pages are wrapped in RequireAuth; the signed-in user is u1 ("Ada").
vi.mock('../app/login/context', () => ({ useAuth: () => ({ user: fakeUser, isLoading: false }) }));
vi.mock('../app/game/socket-context', () => ({
	GameSocketProvider: ({ children }: { children: React.ReactNode }) => children,
	useGameSocket: () => gameMocks.useGameSocket(),
}));

import EditorPage from '../app/editor/page';
import GamePage from '../app/game/[gameId]/page';

// Matches the NEXT_PUBLIC_CODE_URL fallback in app/editor/controller.tsx.
const CODE_URL = 'http://127.0.0.1:4001';

// A problem with `count` test cases: inputs "[0]".."[count-1]", outputs "0"..
function problemWithCases(id: number, count: number) {
	const indexes = Array.from({ length: count }, (_, index) => index);
	return makeProblem(id, 'Easy', {
		input_output: { inputs: indexes.map((index) => `[${index}]`), outputs: indexes.map(String) },
	});
}

// Stands in for CodeService. Practice asks GET /problem for its problems; the
// game asks GET /problem/:id for each one. Run and Submit answer "Accepted".
function stubCodeService(caseCount: number) {
	return stubFetch((url, init) => {
		if (init?.method === 'POST') return jsonResponse({ verdict: 'Accepted', passed: 1, case: null, response: null });
		if (url === `${CODE_URL}/problem`) return jsonResponse([problemWithCases(1, caseCount), problemWithCases(2, caseCount), problemWithCases(3, caseCount)]);
		return jsonResponse(problemWithCases(Number(url.split('/').pop()), caseCount));
	});
}

// The practice page, once its first problem has loaded.
async function renderPractice(caseCount = 15) {
	const fetchMock = stubCodeService(caseCount);
	render(<EditorPage />);
	await screen.findByRole('heading', { name: /1\. Problem Number 1/ });
	return fetchMock;
}

type TeamId = 'a' | 'b';

function player(userId: string, displayName: string, team: TeamId, connected = true) {
	return { userId, displayName, team, connected, left: false };
}

// A 3v3 with the signed-in user (u1, "Ada") on Team 1 alongside Grace and Katherine.
const roster = [
	player('u1', 'Ada', 'a'),
	player('u2', 'Grace', 'a'),
	player('u3', 'Katherine', 'a'),
	player('u4', 'Alan', 'b'),
	player('u5', 'Edsger', 'b'),
	player('u6', 'Margaret', 'b'),
];

// The default roster with the given players marked disconnected.
function rosterWithDisconnected(...userIds: string[]) {
	return roster.map((entry) => (userIds.includes(entry.userId) ? { ...entry, connected: false } : entry));
}

const problemPool = [
	{ taskId: 'two-sum', questionId: 1, difficulty: 'Easy', topics: ['Array'], bannedBy: null },
	{ taskId: 'valid-parentheses', questionId: 2, difficulty: 'Easy', topics: ['Stack'], bannedBy: null },
];

// What useGameSocket returns: a connected match in the playing phase unless overridden.
function configureGame(overrides: Record<string, unknown> = {}, teammateCode: Record<string, unknown> = {}) {
	gameMocks.useGameSocket.mockReturnValue({
		socket: { connected: true, emit: vi.fn(), on: vi.fn(), off: vi.fn() },
		connected: true,
		game: {
			gameId: 'game-1',
			phase: 'playing',
			startedAt: Date.now(),
			secondsRemaining: 20 * 60,
			banSecondsRemaining: 25,
			scores: { a: 0, b: 0 },
			problemPool,
			players: roster,
			forfeitVotes: { a: 0, b: 0 },
			...overrides,
		},
		result: null,
		error: null,
		connect: vi.fn(),
		clearError: vi.fn(),
		forfeit: vi.fn(),
		ban: vi.fn(),
		pick: vi.fn(),
		submit: vi.fn(),
		shareCode: vi.fn(),
		teammateCode,
		// No teammate has edited anything yet (US-6-T-13).
		teammateQuestion: {},
	});
}

// The game page once the editor's first problem has loaded.
async function renderPlaying(overrides: Record<string, unknown> = {}, teammateCode: Record<string, unknown> = {}) {
	configureGame(overrides, teammateCode);
	const view = render(<GamePage />);
	await screen.findByRole('heading', { name: /1\. Problem Number 1/ });
	return view;
}

// The page's top bar: the first banner (the ban screen has a <header> of its own).
function topBar() {
	return within(screen.getAllByRole('banner')[0]);
}

// A teammate's shared code for question 1, as GameService relays it.
function workspace(code: string) {
	return { tabs: [{ id: 'tab-1', name: 'Tab 1', code }], activeTabId: 'tab-1' };
}

beforeEach(() => {
	vi.clearAllMocks();
	vi.unstubAllGlobals();
	stubCodeService(15);
});

afterEach(() => cleanup());

describe('practice page has no match parts', () => {
	it('US5-Task19 does not show "Team 1" on the practice page', async () => {
		await renderPractice();
		expect(screen.queryByText('Team 1')).toBeNull();
	});

	it('US5-Task19 does not show "Team 2" on the practice page', async () => {
		await renderPractice();
		expect(screen.queryByText('Team 2')).toBeNull();
	});

	it('US5-Task19 does not show a "Time left" timer on the practice page', async () => {
		await renderPractice();
		expect(screen.queryByLabelText('Time left')).toBeNull();
	});

	it('US5-Task19 does not show a "Team chat" panel on the practice page', async () => {
		await renderPractice();
		expect(screen.queryByRole('region', { name: 'Team chat' })).toBeNull();
	});
});

describe('only the first three test cases are visible', () => {
	it('US5-Task19 shows a "Case 1" tab for a problem with 15 test cases', async () => {
		await renderPractice(15);
		expect(screen.getByRole('button', { name: 'Case 1' })).toBeTruthy();
	});

	it('US5-Task19 shows a "Case 3" tab for a problem with 15 test cases', async () => {
		await renderPractice(15);
		expect(screen.getByRole('button', { name: 'Case 3' })).toBeTruthy();
	});

	it('US5-Task19 does not show a "Case 4" tab for a problem with 15 test cases', async () => {
		await renderPractice(15);
		expect(screen.queryByRole('button', { name: 'Case 4' })).toBeNull();
	});

	it('US5-Task19 says the other 12 cases are hidden and run on submit', async () => {
		await renderPractice(15);
		expect(screen.getByText('+12 hidden, run on submit')).toBeTruthy();
	});

	it('US5-Task19 shows a "Case 2" tab for a problem with 2 test cases', async () => {
		await renderPractice(2);
		expect(screen.getByRole('button', { name: 'Case 2' })).toBeTruthy();
	});

	it('US5-Task19 does not mention hidden cases for a problem with 2 test cases', async () => {
		await renderPractice(2);
		expect(screen.queryByText(/hidden, run on submit/)).toBeNull();
	});

	it('US5-Task19 sends only the first 3 cases to CodeService on Run', async () => {
		const fetchMock = await renderPractice(15);
		await userEvent.click(screen.getByRole('button', { name: 'Run' }));

		// The Run request is the POST to /solution; its body carries the cases.
		await waitFor(() => {
			const run = requestsOf(fetchMock).find((request) => request.url === `${CODE_URL}/solution`);
			expect((run?.body as { cases: unknown[] } | undefined)?.cases).toEqual([
				{ input: '[0]', expected: '0' },
				{ input: '[1]', expected: '1' },
				{ input: '[2]', expected: '2' },
			]);
		});
	});

	it('US5-Task19 still sends only the code on Submit, so CodeService runs every case', async () => {
		const fetchMock = await renderPractice(15);
		fireEvent.change(screen.getByTestId('monaco'), { target: { value: 'code to submit' } });
		await userEvent.click(screen.getByRole('button', { name: 'Submit' }));

		await waitFor(() => {
			const submit = requestsOf(fetchMock).find((request) => request.url === `${CODE_URL}/solution/1`);
			expect(submit?.body).toEqual({ code: 'code to submit' });
		});
	});
});

describe('the match fills the page while playing', () => {
	it('US5-Task19 does not show the "Match" heading while playing', async () => {
		await renderPlaying();
		expect(screen.queryByRole('heading', { name: 'Match' })).toBeNull();
	});

	it('US5-Task19 does not show the "Team 1 players" list while playing', async () => {
		await renderPlaying();
		expect(screen.queryByRole('list', { name: 'Team 1 players' })).toBeNull();
	});

	it('US5-Task19 does not show the "Team 2 players" list while playing', async () => {
		await renderPlaying();
		expect(screen.queryByRole('list', { name: 'Team 2 players' })).toBeNull();
	});

	it('US5-Task19 still shows the "Team 1 players" list while banning', () => {
		configureGame({ phase: 'banning' });
		render(<GamePage />);
		expect(screen.getByRole('list', { name: 'Team 1 players' })).toBeTruthy();
	});
});

describe('score and time in the top bar while playing', () => {
	it('shows "Your team" in the top bar (was "Team 1")', async () => {
		await renderPlaying();
		expect(topBar().getByText('Your team')).toBeTruthy();
	});

	it('shows "Rival team" in the top bar (was "Team 2")', async () => {
		await renderPlaying();
		expect(topBar().getByText('Rival team')).toBeTruthy();
	});

	it('US5-Task19 shows 120 as Team 1\'s score in the top bar', async () => {
		await renderPlaying({ scores: { a: 120, b: 80 } });
		expect(topBar().getByTestId('score-a').textContent).toBe('120');
	});

	it('US5-Task19 shows 80 as Team 2\'s score in the top bar', async () => {
		await renderPlaying({ scores: { a: 120, b: 80 } });
		expect(topBar().getByTestId('score-b').textContent).toBe('80');
	});

	// Sprint 4 polish: the user's own team always comes first, in the primary color.
	it('shows a team b user\'s own score first in the top bar', async () => {
		await renderPlaying({ scores: { a: 120, b: 80 }, players: roster.map((entry) => ({ ...entry, team: entry.team === 'a' ? 'b' : 'a' })) });
		expect(topBar().getAllByTestId(/^score-/).map((score) => score.textContent)).toEqual(['80', '120']);
	});

	it('colors a team b user\'s own score with the primary color in the top bar', async () => {
		await renderPlaying({ scores: { a: 120, b: 80 }, players: roster.map((entry) => ({ ...entry, team: entry.team === 'a' ? 'b' : 'a' })) });
		expect(topBar().getByTestId('score-b').className).toContain('text-primary');
	});

	it('US5-Task19 shows 12:34 in the top bar when 754 seconds are left', async () => {
		await renderPlaying({ secondsRemaining: 754 });
		expect(topBar().getByText('12:34')).toBeTruthy();
	});

	it('US5-Task19 still shows the Forfeit button in the top bar', async () => {
		await renderPlaying();
		expect(topBar().getByRole('button', { name: 'Forfeit' })).toBeTruthy();
	});
});

describe('teammate tabs show who is disconnected', () => {
	it('US5-Task19 does not label a connected teammate\'s tab as disconnected', async () => {
		await renderPlaying();
		expect(screen.queryByRole('tab', { name: /disconnected/ })).toBeNull();
	});

	it('US5-Task19 labels a disconnected teammate\'s tab "<name>, disconnected"', async () => {
		await renderPlaying({ players: rosterWithDisconnected('u2') });
		expect(screen.getByRole('tab', { name: 'Grace, disconnected' })).toBeTruthy();
	});

	it('US5-Task19 fades a disconnected teammate\'s tab', async () => {
		await renderPlaying({ players: rosterWithDisconnected('u2') });
		expect(screen.getByRole('tab', { name: 'Grace, disconnected' }).classList.contains('opacity-50')).toBe(true);
	});

	it('US5-Task19 shows the disconnected icon on a disconnected teammate\'s tab', async () => {
		await renderPlaying({ players: rosterWithDisconnected('u2') });
		const tab = screen.getByRole('tab', { name: 'Grace, disconnected' });
		expect(within(tab).getByTestId('disconnected-icon')).toBeTruthy();
	});

	it('US5-Task19 still opens a disconnected teammate\'s read-only code', async () => {
		await renderPlaying({ players: rosterWithDisconnected('u2') }, { u2: { 1: workspace('grace code') } });
		await userEvent.click(screen.getByRole('tab', { name: 'Grace, disconnected' }));
		expect((await screen.findByDisplayValue('grace code') as HTMLTextAreaElement).readOnly).toBe(true);
	});

	it('US5-Task19 stops fading a teammate\'s tab once they reconnect', async () => {
		const { rerender } = await renderPlaying({ players: rosterWithDisconnected('u2') });
		configureGame();
		rerender(<GamePage />);
		expect(screen.getByRole('tab', { name: 'Grace' }).classList.contains('opacity-50')).toBe(false);
	});
});

describe('viewing a teammate\'s code', () => {
	it('US5-Task19 shows "Grace\'s code, read only" while viewing Grace', async () => {
		await renderPlaying({}, { u2: { 1: workspace('grace code') } });
		await userEvent.click(screen.getByRole('tab', { name: 'Grace' }));
		expect(await screen.findByText('Grace\'s code, read only')).toBeTruthy();
	});

	it('US5-Task19 does not show the old "Viewing Grace\'s workspace" banner', async () => {
		await renderPlaying({}, { u2: { 1: workspace('grace code') } });
		await userEvent.click(screen.getByRole('tab', { name: 'Grace' }));
		await screen.findByDisplayValue('grace code');
		// Checked on the page's whole text: the banner's name is its own text node.
		expect(document.body.textContent).not.toContain('Viewing Grace\'s workspace');
	});
});
