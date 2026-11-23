// US-6-T-2: Game page should connect to the game socket for the game in the URL
//  - On open, the page should connect using the gameId from the URL
//  - While the socket is not connected, "Joining match…" should be displayed
// Game page should show connection problems
//  - When the socket context has an error, its message should appear in an alert
//  - When the connection fails, a link back to the lobby should be shown
// Game page should show the match once connected
//  - Each player's display name should be rendered
//  - Team 1 should list its three players
//  - A player who is not connected should display "Reconnecting…"
//  - The time remaining should be displayed as minutes and seconds
// Game page should show the match waiting for its players
//  - While the game is waiting with 2 of 6 players connected, "Waiting for players (2/6)" should be displayed
// Players should be able to forfeit from the top bar
//  - During a match, a "Forfeit" button should appear in the top bar
//  - The Forfeit button should sit to the left of the account menu button
//  - While the game is waiting for players, the Forfeit button should not be shown
//  - Clicking Forfeit should open a confirmation dialog
//  - Clicking Cancel should close the dialog without forfeiting
//  - Confirming should send the forfeit to the game
//  - After confirming, the Forfeit button should be disabled
// Game page should show the result once the game ends
//  - When team b wins, "Team 2 wins" should be displayed
//  - When the game ends in a draw, "Draw" should be displayed
//  - Once the game has ended, the Forfeit button should not be shown
// (The "Each problem in the match pool should be listed" and "Game page should
// show each problem's details" tests were removed by US-6-T-5: the game page no
// longer lists the match's questions.)
// Game page should show a win by solving every problem
//  - When the game was won by solving every problem, "by solving every problem" should be displayed
// Game page should show the ban screen during the ban phase
//  - While the game is banning, "Ban a question" should be displayed
//  - While the game is banning, the problem list for play should not be displayed
//  - While the game is banning, the Forfeit button should not be shown
//  - While the game is banning, the time left to ban should be displayed
//  - Once the game is playing, "Ban a question" should not be displayed
// Game page should run the ban screen from the game state
//  - Each problem in the match pool should be shown on the ban screen by its topics
//  - Clicking "Ban this question" should send that problem's questionId to the game
//  - A problem the game state shows banned by another player should display "Banned by <name>"
//  - With four players and one ban made, "1 of 4 bans made" should be displayed
//  - With four players, the ban screen should display four ban markers
//  (all socket traffic is mocked; no test touches GameService)
// US-6-T-5: The game page should not list the match's questions
//  - While the game is waiting for players, no question name should be displayed
//  - While the game is playing, the "Problems" list should not be displayed
// US-6-T-6: Once the bans are in, the game page should show the practice editor
//  - While the game is playing, the code editor should be displayed
//  - While the game is banning, the code editor should not be displayed
//  - While the game is waiting for players, the code editor should not be displayed
//  - The editor should have one question tab per problem left after the bans
//  - The editor should load each problem left in play from CodeService by its question_id
// Submitting in a match should go through the game
//  - Clicking "Submit" should submit the current question's id and code to the game
//  - The game's grading result should be shown in the results panel
//  - When the game refuses a submission with "cooldown", a readable message should be shown
// Running code in a match should work like practice
//  - Clicking "Run" should run the code against CodeService
// A player's code should only go to their own team
//  - Editing code should send it to the game (team-only relay), not to the lobby socket
// US-3-T-2: The match page should show team chat while the game is being played
//  - While playing, the match page should display a "Team chat" panel
//  - Sending a comment on the match page should emit "chat:send" on the game socket
//  (CodeService's fetch and Monaco are mocked; no test touches a backend service)
// US-6-T-8: Game page should show the live team score
//  - The team score shown in the header should match the game state's scores
//  - A new game state with an updated score should update what's shown, without needing to submit again
// US-6-T-7: Game page should show a workspace switcher above the code editor
//  - While playing, a "You" workspace tab and one tab per teammate should be shown above the code tabs
//  - The workspace switcher should never show a tab for a player on the other team
//  - The "You" workspace should be selected by default
//  - While banning or waiting for players, the workspace switcher should not be shown
// Viewing your own workspace should work exactly as before
//  - Selecting "You" after viewing a teammate should restore your own editable tabs and code
//  - Your own code should never be replaced by anything received from a teammate (push only)
// Viewing a teammate's workspace should be read only
//  - Selecting a teammate should show the question they are currently on
//  - Selecting a teammate should show their current tabs (e.g. "Tab 1", "Tab 2")
//  - The Monaco editor should not accept input while viewing a teammate's tab
//  - The teammate's tab strip should not show a "Create new tab" button
//  - The teammate's tab strip should not open a context menu on right-click
//  - Clicking one of the teammate's other tabs should show that tab's code, still read only
//  - A teammate's code update should update the read-only view live
//  - A teammate who hasn't shared any code yet should show their starter code for the question they're on
//  (extends the approved US-6-T-7 draft: a teammate's workspace also has its own question switcher,
//  independent of your own, so you can look at their other match questions too)
//  - Switching the teammate's own question switcher should show that question's code for the teammate
// Sprint 4: the result screen is redesigned (full width, slam, count-up, crowns)
//  - When the player's team wins, the "Victory!" heading should be displayed, and "Defeat" should not
//  - When the other team wins, the "Defeat" heading should be displayed, and "Victory!" should not
//  - Under Defeat, the winning team's heading ("Team 2 wins") should still be displayed
//  - A draw, or someone who is not a player, should see neither Victory! nor Defeat
//  - Someone who is not a player should still see "Team 1 wins"
//  - Victory! should slam in (lb-result-slam); Defeat should sink in (lb-result-sink)
//  - The line explaining why the game ended should no longer be displayed
//  - The result should take the whole page: no "Match" heading
//  - Each team's half ("Team 1" / "Team 2") should list its players in roster order
//  - Every player on the winning team should get a crown ("Winner"); the losers and a draw get none
//  - With reduced motion, each half should show its final score straight away
//  - Otherwise the scores should start at 0 and count up to the final score
//  - A team that finished without points should show 0
//  - "Play again" should link to the lobby, and "Home" to the home page
//  - The crowns should be in the winning team's color (Team 2's crowns in its secondary color)
//  - The frame around the two halves should come in with them, not before (no empty box while the word slams in)
// US-6-T-12: The top bar should show the player's connected teammates next to Forfeit
//  - During a match, the "Teammates" list in the top bar should show each connected teammate's name
//  - The "Teammates" list should not include the signed-in player
//  - The "Teammates" list should not include players on the other team
//  - The "Teammates" list should not include a teammate who is disconnected
//  - The "Teammates" list should sit to the left of the Forfeit button
//  - While the game is waiting for players, the "Teammates" list should not be shown
//  - While the game is banning, the "Teammates" list should not be shown
//  - Once the game has ended, the "Teammates" list should not be shown
//  - When every teammate is disconnected, the "Teammates" list should not be shown
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fakeUser, jsonResponse, makeProblem, requestsOf, stubFetch } from './helpers';

// Shared mocks. The game page never talks to GameService in these tests: the
// auth context and the game socket context are replaced with fakes.
const gameMocks = vi.hoisted(() => ({
	useGameSocket: vi.fn(),
	connect: vi.fn(),
	clearError: vi.fn(),
	forfeit: vi.fn(),
	ban: vi.fn(),
	pick: vi.fn(),
	submit: vi.fn(),
	shareCode: vi.fn(),
	// socket.io-client's io(): the editor must never open a lobby socket in a match.
	io: vi.fn(),
}));

// Monaco needs a real browser; swap it for a textarea with the same contract
// (controlled `value`, `onChange(value)`), as the practice editor tests do.
// A teammate's read-only view passes options.readOnly, which the real Monaco
// would honor; the textarea mirrors that with its own readOnly attribute.
vi.mock('@monaco-editor/react', () => ({
	default: ({ value, onChange, options }: { value: string; onChange?: (_v: string) => void; options?: { readOnly?: boolean } }) => (
		<textarea
			data-testid="monaco"
			value={value}
			readOnly={options?.readOnly}
			onChange={(e) => onChange?.(e.target.value)}
		/>
	),
}));
vi.mock('socket.io-client', () => ({ io: (...args: unknown[]) => gameMocks.io(...args) }));

vi.mock('next/navigation', () => ({
	useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
	// The page under test is always /game/game-1.
	useParams: () => ({ gameId: 'game-1' }),
}));
vi.mock('../app/login/context', () => ({ useAuth: () => ({ user: fakeUser, isLoading: false }) }));
vi.mock('../app/game/socket-context', () => ({
	GameSocketProvider: ({ children }: { children: React.ReactNode }) => children,
	useGameSocket: () => gameMocks.useGameSocket(),
}));

import GamePage from '../app/game/[gameId]/page';

type TeamId = 'a' | 'b';

interface TestPlayer {
	userId: string;
	displayName: string;
	team: TeamId;
	connected: boolean;
}

function player(userId: string, displayName: string, team: TeamId, connected = true): TestPlayer {
	return { userId, displayName, team, connected };
}

// Default roster: two full teams of three, with the signed-in user (u1, "Ada") on Team 1.
const roster: TestPlayer[] = [
	player('u1', 'Ada', 'a'),
	player('u2', 'Grace', 'a'),
	player('u3', 'Katherine', 'a'),
	player('u4', 'Alan', 'b'),
	player('u5', 'Edsger', 'b'),
	player('u6', 'Margaret', 'b'),
];

// The pool as GameService sends it on `game:state`: just enough to list each
// problem and to look it up in CodeService (by questionId) once it's clicked.
const problemPool = [
	{ taskId: 'two-sum', questionId: 1, difficulty: 'Easy' },
	{ taskId: 'valid-parentheses', questionId: 2, difficulty: 'Easy' },
	{ taskId: 'best-time-to-buy-and-sell-stock', questionId: 3, difficulty: 'Medium' },
];

// A freshly started match: full 20 minutes left, no score yet.
function gameState(overrides: Record<string, unknown> = {}) {
	return {
		gameId: 'game-1',
		phase: 'playing',
		startedAt: Date.now(),
		secondsRemaining: 20 * 60,
		scores: { a: 0, b: 0 },
		problemPool,
		players: roster,
		forfeitVotes: { a: 0, b: 0 },
		...overrides,
	};
}

// Sets what useGameSocket returns for the next render. With no overrides the
// page is still waiting for the socket to connect.
function configureGame(context: Record<string, unknown> = {}) {
	gameMocks.useGameSocket.mockReturnValue({
		socket: null,
		connected: false,
		game: null,
		result: null,
		error: null,
		connect: gameMocks.connect,
		clearError: gameMocks.clearError,
		forfeit: gameMocks.forfeit,
		ban: gameMocks.ban,
		pick: gameMocks.pick,
		submit: gameMocks.submit,
		shareCode: gameMocks.shareCode,
		teammateCode: {},
		...context,
	});
}

// The page once the socket is up and the server has sent the match. `teammateCode`
// goes to the context directly (it isn't part of the `game:state` payload).
function configureConnectedGame(overrides: Record<string, unknown> = {}, teammateCode: Record<string, unknown> = {}) {
	configureGame({ socket: { connected: true, emit: vi.fn(), on: vi.fn(), off: vi.fn() }, connected: true, game: gameState(overrides), teammateCode });
}

// Matches the NEXT_PUBLIC_CODE_URL fallback in app/editor/controller.tsx.
const CODE_URL = 'http://127.0.0.1:4001';

// Stands in for CodeService: GET /problem/:questionId serves a full problem
// for whichever question_id was asked for; POST /solution (Run) answers one
// passing case.
function stubCodeService() {
	return stubFetch((url, init) => {
		if (url === `${CODE_URL}/solution` && init?.method === 'POST') {
			return jsonResponse([{ verdict: 'Accepted', expected: '1', response: '1' }]);
		}
		return jsonResponse(makeProblem(Number(url.split('/').pop()), 'Easy'));
	});
}

beforeEach(() => {
	vi.clearAllMocks();
	vi.unstubAllGlobals();
	// Every test gets a fake CodeService, so a playing game's editor never
	// reaches a real one.
	stubCodeService();
	configureGame();
});

afterEach(() => cleanup());

describe('game page connection', () => {
	it('US-6-T-2 connects to the game named in the URL on open', () => {
		render(<GamePage />);

		// The page asks the socket context to join /game/game-1's match.
		expect(gameMocks.connect).toHaveBeenCalledWith('game-1');
	});

	it('US-6-T-2 shows "Joining match…" while the socket is not connected', () => {
		render(<GamePage />);

		expect(screen.getByText('Joining match…')).toBeTruthy();
	});
});

describe('game page connection problems', () => {
	it('US-6-T-2 shows the socket error message in an alert', () => {
		configureGame({ error: { code: 'not-in-game', message: 'You are not a player in this match.' } });
		render(<GamePage />);

		expect(screen.getByRole('alert').textContent).toContain('You are not a player in this match.');
	});

	it('US-6-T-2 shows a link back to the lobby when the connection fails', () => {
		configureGame({ error: { code: 'connection-error', message: 'Could not connect to the game service.' } });
		render(<GamePage />);

		expect(screen.getByRole('link', { name: 'Back to lobby' })).toBeTruthy();
	});
});

describe('game page match view', () => {
	// The rosters show before the match starts; while playing the editor fills
	// the page instead (US-5-T-19), so these render the ban phase.
	const banPool = problemPool.map((entry) => ({ ...entry, topics: ['Array'], bannedBy: null }));

	it('US-6-T-2 renders each player\'s display name', () => {
		configureConnectedGame({ phase: 'banning', banSecondsRemaining: 25, problemPool: banPool });
		render(<GamePage />);

		const rosters = [screen.getByRole('list', { name: 'Team 1 players' }), screen.getByRole('list', { name: 'Team 2 players' })];
		const shown = roster.filter((entry) => rosters.some((list) => within(list).queryByText(entry.displayName) !== null));
		expect(shown).toHaveLength(6);
	});

	it('US-6-T-2 lists Team 1\'s three players', () => {
		configureConnectedGame({ phase: 'banning', banSecondsRemaining: 25, problemPool: banPool });
		render(<GamePage />);

		const teamOne = screen.getByRole('list', { name: 'Team 1 players' });
		expect(within(teamOne).getAllByRole('listitem')).toHaveLength(3);
	});

	it('US-6-T-2 shows "Reconnecting…" for a player who is not connected', () => {
		configureConnectedGame({ phase: 'banning', banSecondsRemaining: 25, problemPool: banPool, players: roster.map((entry) => (entry.userId === 'u4' ? { ...entry, connected: false } : entry)) });
		render(<GamePage />);

		// Only Alan dropped, so exactly one row shows the reconnecting label.
		expect(screen.getAllByText('Reconnecting…')).toHaveLength(1);
	});

	it('US-6-T-2 shows the time remaining as minutes and seconds', () => {
		configureConnectedGame({ secondsRemaining: 20 * 60 });
		render(<GamePage />);

		expect(screen.getByText('20:00')).toBeTruthy();
	});

	it('US-6-T-8 shows the team score from the game state', () => {
		configureConnectedGame({ scores: { a: 120, b: 80 } });
		render(<GamePage />);

		// The score sits in the middle of the top bar (US-5-T-19): Team 1's is score-a.
		expect(within(screen.getAllByRole('banner')[0]).getByTestId('score-a').textContent).toBe('120');
	});

	it('US-6-T-8 updates the shown score when a new game state arrives', async () => {
		configureConnectedGame({ scores: { a: 0, b: 0 } });
		const { rerender } = render(<GamePage />);
		configureConnectedGame({ scores: { a: 150, b: 0 } });

		rerender(<GamePage />);

		// The score counts up to its new value over 0.6s (US-4-T-6), so wait for it to land.
		expect(await screen.findByText('150', {}, { timeout: 3000 })).toBeTruthy();
	});
});

describe('game page while waiting for players', () => {
	it('US-6-T-2 shows how many players have connected', () => {
		const twoConnected = roster.map((entry, i) => ({ ...entry, connected: i < 2 }));
		configureConnectedGame({ phase: 'waiting', players: twoConnected });
		render(<GamePage />);

		expect(screen.getByText('Waiting for players (2/6)')).toBeTruthy();
	});
});

describe('game page forfeit', () => {
	function forfeitButton() {
		return screen.getByRole('button', { name: 'Forfeit' });
	}

	it('US-6-T-2 shows a Forfeit button in the top bar during a match', () => {
		configureConnectedGame();
		render(<GamePage />);

		expect(within(screen.getByRole('banner')).getByRole('button', { name: 'Forfeit' })).toBeTruthy();
	});

	it('US-6-T-2 puts the Forfeit button to the left of the account menu', () => {
		configureConnectedGame();
		render(<GamePage />);

		const menu = screen.getByRole('button', { name: 'Account menu' });
		// DOCUMENT_POSITION_FOLLOWING: the menu comes after the Forfeit button.
		expect(forfeitButton().compareDocumentPosition(menu) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
	});

	it('US-6-T-2 hides the Forfeit button while waiting for players', () => {
		configureConnectedGame({ phase: 'waiting' });
		render(<GamePage />);

		expect(screen.queryByRole('button', { name: 'Forfeit' })).toBeNull();
	});

	it('US-6-T-2 asks for confirmation when Forfeit is clicked', async () => {
		const user = userEvent.setup();
		configureConnectedGame();
		render(<GamePage />);

		await user.click(forfeitButton());

		expect(screen.getByRole('dialog', { name: 'Forfeit the match?' })).toBeTruthy();
	});

	// Motion rule: the dialog enters from scale 0.97 and opacity 0 (lb-enter), not from nothing.
	it('plays the entrance animation on the forfeit dialog', async () => {
		const user = userEvent.setup();
		configureConnectedGame();
		render(<GamePage />);

		await user.click(forfeitButton());

		expect(screen.getByRole('dialog', { name: 'Forfeit the match?' }).classList.contains('lb-enter')).toBe(true);
	});

	it('US-6-T-2 closes the dialog without forfeiting when Cancel is clicked', async () => {
		const user = userEvent.setup();
		configureConnectedGame();
		render(<GamePage />);

		await user.click(forfeitButton());
		await user.click(screen.getByRole('button', { name: 'Cancel' }));

		expect({ dialog: screen.queryByRole('dialog'), forfeits: gameMocks.forfeit.mock.calls.length }).toEqual({ dialog: null, forfeits: 0 });
	});

	it('US-6-T-2 sends the forfeit when confirmed', async () => {
		const user = userEvent.setup();
		configureConnectedGame();
		render(<GamePage />);

		await user.click(forfeitButton());
		await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Forfeit' }));

		expect(gameMocks.forfeit).toHaveBeenCalled();
	});

	it('US-6-T-2 disables the Forfeit button once the forfeit is sent', async () => {
		const user = userEvent.setup();
		configureConnectedGame();
		render(<GamePage />);

		await user.click(forfeitButton());
		await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Forfeit' }));

		expect((forfeitButton() as HTMLButtonElement).disabled).toBe(true);
	});
});

// US-6-T-12: the signed-in user is u1 ("Ada") on Team 1, so with the default
// roster their connected teammates are Grace (u2) and Katherine (u3); Alan,
// Edsger and Margaret are on Team 2 and must never be listed.
describe('game page teammates next to Forfeit', () => {
	// The "Teammates" list, looked up inside the top bar so a teammate list
	// anywhere else on the page can't satisfy the tests. The top bar is the
	// first banner; the ban screen renders a <header> of its own below it.
	function teammatesList() {
		return within(screen.getAllByRole('banner')[0]).queryByRole('list', { name: 'Teammates' });
	}

	// The names in the "Teammates" list, in the order shown.
	function teammateNames() {
		const list = teammatesList();
		return list ? within(list).getAllByRole('listitem').map((item) => (item.textContent ?? '').trim()) : [];
	}

	// The default roster with the given players marked disconnected.
	function rosterWithDisconnected(...userIds: string[]) {
		return roster.map((entry) => (userIds.includes(entry.userId) ? { ...entry, connected: false } : entry));
	}

	it('US-6-T-12 lists each connected teammate by name in the top bar', () => {
		configureConnectedGame();
		render(<GamePage />);

		expect(teammateNames()).toEqual(['Grace', 'Katherine']);
	});

	it('US-6-T-12 does not list the signed-in player', () => {
		configureConnectedGame();
		render(<GamePage />);

		expect(teammateNames()).not.toContain('Ada');
	});

	it('US-6-T-12 does not list players on the other team', () => {
		configureConnectedGame();
		render(<GamePage />);

		// None of Team 2's players may appear.
		expect(teammateNames().filter((name) => ['Alan', 'Edsger', 'Margaret'].includes(name))).toEqual([]);
	});

	it('US-6-T-12 does not list a disconnected teammate', () => {
		configureConnectedGame({ players: rosterWithDisconnected('u2') });
		render(<GamePage />);

		expect(teammateNames()).not.toContain('Grace');
	});

	it('US-6-T-12 puts the teammates to the left of the Forfeit button', () => {
		configureConnectedGame();
		render(<GamePage />);

		const list = within(screen.getAllByRole('banner')[0]).getByRole('list', { name: 'Teammates' });
		const forfeit = screen.getByRole('button', { name: 'Forfeit' });
		// DOCUMENT_POSITION_FOLLOWING: the Forfeit button comes after the list.
		expect(list.compareDocumentPosition(forfeit) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
	});

	it('US-6-T-12 hides the teammates while waiting for players', () => {
		configureConnectedGame({ phase: 'waiting' });
		render(<GamePage />);

		expect(teammatesList()).toBeNull();
	});

	it('US-6-T-12 hides the teammates while banning', () => {
		// The ban screen needs each problem's topics and ban state.
		const banPool = problemPool.map((entry) => ({ ...entry, topics: ['Array'], bannedBy: null }));
		configureConnectedGame({ phase: 'banning', banSecondsRemaining: 25, problemPool: banPool });
		render(<GamePage />);

		expect(teammatesList()).toBeNull();
	});

	it('US-6-T-12 hides the teammates once the game has ended', () => {
		// Still connected and still "playing" in the last game:state, but game:ended has arrived.
		configureGame({ socket: { connected: true, emit: vi.fn(), on: vi.fn(), off: vi.fn() }, connected: true, game: gameState(), result: { winner: 'a', reason: 'time' } });
		render(<GamePage />);

		expect(teammatesList()).toBeNull();
	});

	it('US-6-T-12 hides the teammates when every teammate is disconnected', () => {
		configureConnectedGame({ players: rosterWithDisconnected('u2', 'u3') });
		render(<GamePage />);

		expect(teammatesList()).toBeNull();
	});
});

// The end of the match (sprint 4 redesign): a full-width screen, "Victory!" or
// "Defeat" for the players, the winning team under it, then each team's half:
// name, score (counting up from 0) and players, with a crown on every winner.
// The signed-in user is always u1 ("Ada"), on Team 1 (team a), so a win for
// team a is a win for the viewer.
describe('game page result', () => {
	// The match as it stood when it ended: the last game:state the page saw
	// (scores and roster), plus the game:ended result.
	function configureEndedGame(result: Record<string, unknown>, overrides: Record<string, unknown> = {}) {
		configureGame({ connected: false, game: gameState(overrides), result });
	}

	// jsdom has no matchMedia. This stands in for it so a test can turn
	// "reduce motion" on (the scores then skip the count-up).
	function stubReducedMotion(reduce: boolean) {
		vi.stubGlobal('matchMedia', (query: string) => ({
			matches: reduce && query === '(prefers-reduced-motion: reduce)',
			media: query,
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
		}));
	}

	// One team's half of the result screen, found by its label ("Your team" / "Rival team").
	const half = (name: string) => screen.getByRole('region', { name });

	// Exact-text matcher for either word, so "Victory!" in some other sentence
	// can't make a "neither is shown" test pass or fail by accident.
	const victoryOrDefeat = /^(Victory!|Defeat)$/;

	it('US-6-T-2 shows the winning team', () => {
		configureEndedGame({ winner: 'b', reason: 'forfeit' });
		render(<GamePage />);

		expect(screen.getByRole('heading', { name: 'Rival team wins' })).toBeTruthy();
	});

	it('US-6-T-2 shows a draw', () => {
		configureEndedGame({ winner: null, reason: 'time' });
		render(<GamePage />);

		expect(screen.getByRole('heading', { name: 'Draw' })).toBeTruthy();
	});

	it('US-6-T-2 hides the Forfeit button once the game has ended', () => {
		configureEndedGame({ winner: 'a', reason: 'time' });
		render(<GamePage />);

		expect(screen.queryByRole('button', { name: 'Forfeit' })).toBeNull();
	});

	it('shows Victory! when the player\'s team wins', () => {
		configureEndedGame({ winner: 'a', reason: 'time' });
		render(<GamePage />);

		expect(screen.getByRole('heading', { name: 'Victory!' })).toBeTruthy();
	});

	it('does not show Defeat when the player\'s team wins', () => {
		configureEndedGame({ winner: 'a', reason: 'time' });
		render(<GamePage />);

		expect(screen.queryByText('Defeat')).toBeNull();
	});

	it('shows Defeat when the other team wins', () => {
		configureEndedGame({ winner: 'b', reason: 'forfeit' });
		render(<GamePage />);

		expect(screen.getByRole('heading', { name: 'Defeat' })).toBeTruthy();
	});

	it('does not show Victory! when the other team wins', () => {
		configureEndedGame({ winner: 'b', reason: 'forfeit' });
		render(<GamePage />);

		expect(screen.queryByText('Victory!')).toBeNull();
	});

	it('still names the winning team under Defeat', () => {
		configureEndedGame({ winner: 'b', reason: 'forfeit' });
		render(<GamePage />);

		expect(screen.getByRole('heading', { name: 'Rival team wins' })).toBeTruthy();
	});

	it('shows neither Victory! nor Defeat for a draw', () => {
		configureEndedGame({ winner: null, reason: 'time' });
		render(<GamePage />);

		expect(screen.queryByText(victoryOrDefeat)).toBeNull();
	});

	it('shows neither Victory! nor Defeat to someone who is not a player', () => {
		// The roster without u1: the signed-in user has no team in this match.
		configureEndedGame({ winner: 'a', reason: 'time' }, { players: roster.filter((entry) => entry.userId !== 'u1') });
		render(<GamePage />);

		expect(screen.queryByText(victoryOrDefeat)).toBeNull();
	});

	it('still names the winning team to someone who is not a player', () => {
		configureEndedGame({ winner: 'a', reason: 'time' }, { players: roster.filter((entry) => entry.userId !== 'u1') });
		render(<GamePage />);

		expect(screen.getByRole('heading', { name: 'Team 1 wins' })).toBeTruthy();
	});

	it('slams Victory! in', () => {
		configureEndedGame({ winner: 'a', reason: 'time' });
		render(<GamePage />);

		expect(screen.getByTestId('result-word').classList.contains('lb-result-slam')).toBe(true);
	});

	it('sinks Defeat in instead of slamming it', () => {
		configureEndedGame({ winner: 'b', reason: 'time' });
		render(<GamePage />);

		expect(screen.getByTestId('result-word').classList.contains('lb-result-sink')).toBe(true);
	});

	it('no longer explains why the game ended', () => {
		configureEndedGame({ winner: 'b', reason: 'forfeit' });
		render(<GamePage />);

		expect(screen.queryByText(/by forfeit/)).toBeNull();
	});

	it('takes the whole page instead of sitting under the Match heading', () => {
		configureEndedGame({ winner: 'a', reason: 'time' });
		render(<GamePage />);

		expect(screen.queryByRole('heading', { name: 'Match' })).toBeNull();
	});

	it('lists your team\'s players in its half', () => {
		configureEndedGame({ winner: 'a', reason: 'time' });
		render(<GamePage />);

		expect(within(half('Your team')).getAllByRole('listitem').map((item) => item.textContent)).toEqual(['Ada', 'Grace', 'Katherine']);
	});

	it('lists the rival team\'s players in its half', () => {
		configureEndedGame({ winner: 'a', reason: 'time' });
		render(<GamePage />);

		expect(within(half('Rival team')).getAllByRole('listitem').map((item) => item.textContent)).toEqual(['Alan', 'Edsger', 'Margaret']);
	});

	it('puts a crown on every player of the winning team', () => {
		configureEndedGame({ winner: 'a', reason: 'time' });
		render(<GamePage />);

		expect(within(half('Your team')).getAllByRole('img', { name: 'Winner' })).toHaveLength(3);
	});

	it('puts no crown on the losing team', () => {
		configureEndedGame({ winner: 'a', reason: 'time' });
		render(<GamePage />);

		expect(within(half('Rival team')).queryAllByRole('img', { name: 'Winner' })).toHaveLength(0);
	});

	it('puts no crowns on anyone after a draw', () => {
		configureEndedGame({ winner: null, reason: 'time' });
		render(<GamePage />);

		expect(screen.queryAllByRole('img', { name: 'Winner' })).toHaveLength(0);
	});

	it('shows each team\'s final score straight away when motion is reduced', () => {
		stubReducedMotion(true);
		configureEndedGame({ winner: 'a', reason: 'time' }, { scores: { a: 450, b: 300 } });
		render(<GamePage />);

		expect(within(half('Your team')).getByTestId('final-score').textContent).toBe('450');
	});

	it('starts the scores counting from 0', () => {
		stubReducedMotion(false);
		configureEndedGame({ winner: 'a', reason: 'time' }, { scores: { a: 450, b: 300 } });
		render(<GamePage />);

		expect(within(half('Rival team')).getByTestId('final-score').textContent).toBe('0');
	});

	it('counts the scores up to the final score', async () => {
		stubReducedMotion(false);
		vi.useFakeTimers();
		configureEndedGame({ winner: 'a', reason: 'time' }, { scores: { a: 450, b: 300 } });
		render(<GamePage />);

		// The count-up waits for the halves to come in, then runs: 3s covers both.
		await act(async () => {
			vi.advanceTimersByTime(3000);
		});
		vi.useRealTimers();

		expect(within(half('Rival team')).getByTestId('final-score').textContent).toBe('300');
	});

	it('shows 0 for a team that finished without points', () => {
		stubReducedMotion(true);
		configureEndedGame({ winner: 'b', reason: 'time' }, { scores: { a: 0, b: 150 } });
		render(<GamePage />);

		expect(within(half('Your team')).getByTestId('final-score').textContent).toBe('0');
	});

	it('offers Play again, which goes to the lobby', () => {
		configureEndedGame({ winner: 'a', reason: 'time' });
		render(<GamePage />);

		expect(screen.getByRole('link', { name: 'Play again' }).getAttribute('href')).toBe('/lobby');
	});

	it('colors the rival team\'s crowns in the rival team\'s color', () => {
		configureEndedGame({ winner: 'b', reason: 'forfeit' });
		render(<GamePage />);

		expect(within(half('Rival team')).getAllByRole('img', { name: 'Winner' })[0].getAttribute('class')).toContain('fill-secondary');
	});

	it('brings the frame around the halves in with them', () => {
		configureEndedGame({ winner: 'a', reason: 'time' });
		render(<GamePage />);

		expect(half('Your team').parentElement?.classList.contains('lb-result-rise')).toBe(true);
	});

	it('offers a way Home', () => {
		configureEndedGame({ winner: 'a', reason: 'time' });
		render(<GamePage />);

		expect(screen.getByRole('link', { name: 'Home' }).getAttribute('href')).toBe('/');
	});
});

describe('game page without the question list', () => {
	it('US-6-T-5 shows no question name while waiting for players', () => {
		configureConnectedGame({ phase: 'waiting' });
		render(<GamePage />);

		// "Two Sum" is the first problem in the mocked pool; its name must not appear.
		expect(screen.queryByText(/Two Sum/)).toBeNull();
	});

	it('US-6-T-5 does not show the "Problems" list while playing', () => {
		configureConnectedGame();
		render(<GamePage />);

		expect(screen.queryByRole('list', { name: 'Problems' })).toBeNull();
	});
});

describe('game page during the ban phase', () => {
	// The nine-problem pool as GameService sends it while banning: each problem
	// carries its topics and who (if anyone) has banned it.
	const banPool = [
		{ taskId: 'two-sum', questionId: 1, difficulty: 'Easy', topics: ['Array', 'Hash Table'], bannedBy: null },
		{ taskId: 'valid-parentheses', questionId: 2, difficulty: 'Easy', topics: ['Stack'], bannedBy: null },
		{ taskId: 'climbing-stairs', questionId: 3, difficulty: 'Easy', topics: ['Dynamic Programming'], bannedBy: null },
		{ taskId: 'valid-palindrome', questionId: 4, difficulty: 'Easy', topics: ['String'], bannedBy: null },
		{ taskId: 'search-insert-position', questionId: 5, difficulty: 'Easy', topics: ['Binary Search'], bannedBy: null },
		{ taskId: 'assign-cookies', questionId: 6, difficulty: 'Easy', topics: ['Greedy'], bannedBy: null },
		{ taskId: 'number-of-islands', questionId: 7, difficulty: 'Medium', topics: ['Graph'], bannedBy: null },
		{ taskId: 'coin-change', questionId: 8, difficulty: 'Medium', topics: ['Dynamic Programming', 'Array'], bannedBy: null },
		{ taskId: 'course-schedule', questionId: 9, difficulty: 'Medium', topics: ['Topological Sort'], bannedBy: null },
	];

	// Grace (u2, Team 1) has banned the second problem.
	const poolWithGraceBan = banPool.map((entry) => (entry.questionId === 2
		? { ...entry, bannedBy: { userId: 'u2', displayName: 'Grace', team: 'a' } }
		: entry));

	// A 2v2: Ada and Grace on Team 1, Alan and Edsger on Team 2.
	const fourPlayers = roster.filter((entry) => ['u1', 'u2', 'u4', 'u5'].includes(entry.userId));

	// The page while the bans are going on, 25 seconds left to ban.
	function configureBanning(overrides: Record<string, unknown> = {}) {
		configureConnectedGame({ phase: 'banning', startedAt: null, banSecondsRemaining: 25, problemPool: banPool, ...overrides });
	}

	it('shows "Ban a question" while the game is banning', () => {
		configureBanning();
		render(<GamePage />);

		expect(screen.getByRole('heading', { name: 'Ban a question' })).toBeTruthy();
	});

	it('hides the problem list for play while the game is banning', () => {
		configureBanning();
		render(<GamePage />);

		// The "Problems" list is the in-match list; problems are only picked once play starts.
		expect(screen.queryByRole('list', { name: 'Problems' })).toBeNull();
	});

	it('hides the Forfeit button while the game is banning', () => {
		configureBanning();
		render(<GamePage />);

		expect(screen.queryByRole('button', { name: 'Forfeit' })).toBeNull();
	});

	it('shows the time left to ban while the game is banning', () => {
		configureBanning();
		render(<GamePage />);

		// 25 seconds left in the ban window, shown as minutes and seconds.
		expect(screen.getByText('0:25')).toBeTruthy();
	});

	it('does not show "Ban a question" once the game is playing', () => {
		configureConnectedGame();
		render(<GamePage />);

		expect(screen.queryByRole('heading', { name: 'Ban a question' })).toBeNull();
	});

	it('shows each problem in the pool by its topics on the ban screen', () => {
		configureBanning();
		render(<GamePage />);

		// Every topic of every problem, in pool order.
		expect(screen.getAllByTestId('topic').map((topic) => topic.textContent))
			.toEqual(banPool.flatMap((entry) => entry.topics));
	});

	it('sends the problem\'s questionId to the game when "Ban this question" is clicked', async () => {
		const user = userEvent.setup();
		configureBanning();
		render(<GamePage />);

		// The third problem, climbing-stairs, has questionId 3.
		await user.click(screen.getAllByRole('button', { name: /Ban this question/ })[2]);

		expect(gameMocks.ban).toHaveBeenCalledWith(3);
	});

	it('shows "Banned by <name>" on a problem another player banned', () => {
		configureBanning({ problemPool: poolWithGraceBan });
		render(<GamePage />);

		expect(screen.getByText(/Banned by/).textContent).toContain('Grace');
	});

	it('shows "1 of 4 bans made" with four players and one ban made', () => {
		configureBanning({ players: fourPlayers, problemPool: poolWithGraceBan });
		render(<GamePage />);

		expect(screen.getByText('1 of 4 bans made')).toBeTruthy();
	});

	it('shows four ban markers with four players', () => {
		configureBanning({ players: fourPlayers });
		const { container } = render(<GamePage />);

		// One marker per player, filled or not.
		expect(container.querySelectorAll('[data-seat]')).toHaveLength(4);
	});
});

describe('game page during the pick phase', () => {
	// The three problems left after a 3v3's bans, as GameService sends them
	// while picking: each carries who (if anyone) on each team has picked it.
	const pickPool = [
		{ taskId: 'search-insert-position', questionId: 4, difficulty: 'Easy', topics: ['Binary Search'], pickedBy: { a: null, b: null } },
		{ taskId: 'number-of-islands', questionId: 7, difficulty: 'Medium', topics: ['Graph'], pickedBy: { a: null, b: null } },
		{ taskId: 'course-schedule', questionId: 9, difficulty: 'Medium', topics: ['Topological Sort'], pickedBy: { a: null, b: null } },
	];

	// Grace (u2, Team 1) has picked the first problem.
	const poolWithGracePick = pickPool.map((entry) => (entry.questionId === 4
		? { ...entry, pickedBy: { ...entry.pickedBy, a: { userId: 'u2', displayName: 'Grace', team: 'a' } } }
		: entry));

	// The page while the picks are going on, 25 seconds left to pick.
	function configurePicking(overrides: Record<string, unknown> = {}) {
		configureConnectedGame({ phase: 'picking', startedAt: null, pickSecondsRemaining: 25, problemPool: pickPool, ...overrides });
	}

	it('shows "Pick a question" while the game is picking', () => {
		configurePicking();
		render(<GamePage />);

		expect(screen.getByRole('heading', { name: 'Pick a question' })).toBeTruthy();
	});

	it('hides the code editor while the game is picking', () => {
		configurePicking();
		render(<GamePage />);

		expect(screen.queryByTestId('monaco')).toBeNull();
	});

	it('hides the Forfeit button while the game is picking', () => {
		configurePicking();
		render(<GamePage />);

		expect(screen.queryByRole('button', { name: 'Forfeit' })).toBeNull();
	});

	it('shows the time left to pick while the game is picking', () => {
		configurePicking();
		render(<GamePage />);

		// 25 seconds left in the pick window, shown as minutes and seconds.
		expect(screen.getByText('0:25')).toBeTruthy();
	});

	it('does not show "Pick a question" once the game is playing', () => {
		configureConnectedGame();
		render(<GamePage />);

		expect(screen.queryByRole('heading', { name: 'Pick a question' })).toBeNull();
	});

	it('shows each problem in the pool by its topics on the pick screen', () => {
		configurePicking();
		render(<GamePage />);

		// Every topic of every problem, in pool order.
		expect(screen.getAllByTestId('topic').map((topic) => topic.textContent))
			.toEqual(pickPool.flatMap((entry) => entry.topics));
	});

	it('sends the problem\'s questionId to the game when "Pick this question" is clicked', async () => {
		const user = userEvent.setup();
		configurePicking();
		render(<GamePage />);

		// The second button belongs to question 2, "number-of-islands", questionId 7.
		await user.click(screen.getAllByRole('button', { name: /Pick this question/ })[1]);

		expect(gameMocks.pick).toHaveBeenCalledWith(7);
	});

	it('shows "Picked by <name>" on a problem a teammate picked', () => {
		configurePicking({ problemPool: poolWithGracePick });
		render(<GamePage />);

		expect(screen.getByText(/Picked by/).textContent).toContain('Grace');
	});

	it('shows "1 of 3 picks made" with Ada\'s three-player team and one pick made', () => {
		configurePicking({ problemPool: poolWithGracePick });
		render(<GamePage />);

		expect(screen.getByText('1 of 3 picks made')).toBeTruthy();
	});
});

describe('game page editor after the bans', () => {
	// makeProblem(1, ...) titles itself "1. Problem Number 1" once loaded.
	async function renderPlayingGame() {
		configureConnectedGame();
		render(<GamePage />);
		await screen.findByRole('heading', { name: /1\. Problem Number 1/ });
	}

	// The game's grading for an accepted solution (CodeService's POST /solution/:questionId shape).
	const accepted = { verdict: 'Accepted', passed: 3, total: 3, case: null, expected: null, response: null };

	it('US-6-T-6 shows the code editor while the game is playing', async () => {
		configureConnectedGame();
		render(<GamePage />);

		expect(await screen.findByTestId('monaco')).toBeTruthy();
	});

	it('US-6-T-6 does not show the code editor while the game is banning', () => {
		const banPool = problemPool.map((entry) => ({ ...entry, topics: ['Array'], bannedBy: null }));
		configureConnectedGame({ phase: 'banning', banSecondsRemaining: 25, problemPool: banPool });
		render(<GamePage />);

		expect(screen.queryByTestId('monaco')).toBeNull();
	});

	it('US-6-T-6 does not show the code editor while waiting for players', () => {
		configureConnectedGame({ phase: 'waiting' });
		render(<GamePage />);

		expect(screen.queryByTestId('monaco')).toBeNull();
	});

	it('US-6-T-6 gives the editor one question tab per problem left after the bans', async () => {
		await renderPlayingGame();

		// The mocked pool has three problems left, so the question tabs are 1, 2 and 3.
		expect(screen.getAllByRole('button', { name: /^\d+$/ }).map((tab) => tab.textContent)).toEqual(['1', '2', '3']);
	});

	it('US-6-T-6 loads each problem left in play from CodeService by its question_id', async () => {
		const fetchMock = stubCodeService();
		await renderPlayingGame();

		// The pool's question_ids are 1, 2 and 3.
		expect(requestsOf(fetchMock).map((request) => request.url))
			.toEqual([`${CODE_URL}/problem/1`, `${CODE_URL}/problem/2`, `${CODE_URL}/problem/3`]);
	});

	it('US-6-T-10 opens the editor on the question the player picked, not just the first in the pool', async () => {
		stubCodeService();
		// Ada (u1, Team 1) picked question 2 on the pick screen.
		const pickedPool = problemPool.map((entry) => ({
			...entry,
			pickedBy: { a: entry.questionId === 2 ? { userId: 'u1', displayName: 'Ada', team: 'a' } : null, b: null },
		}));
		configureConnectedGame({ problemPool: pickedPool });
		render(<GamePage />);

		expect(await screen.findByRole('heading', { name: /2\. Problem Number 2/ })).toBeTruthy();
	});

	it('US-6-T-6 submits the current question\'s id and code to the game', async () => {
		gameMocks.submit.mockResolvedValue(accepted);
		await renderPlayingGame();

		fireEvent.change(screen.getByTestId('monaco'), { target: { value: 'print(1)' } });
		await userEvent.click(screen.getByRole('button', { name: 'Submit' }));

		expect(gameMocks.submit).toHaveBeenCalledWith(1, 'print(1)');
	});

	it('US-6-T-6 shows the game\'s grading result in the results panel', async () => {
		gameMocks.submit.mockResolvedValue(accepted);
		await renderPlayingGame();

		await userEvent.click(screen.getByRole('button', { name: 'Submit' }));

		expect(await screen.findByText('Passed: 3 / 3')).toBeTruthy();
	});

	it('US-6-T-6 shows a readable message when the game refuses a submission', async () => {
		// The game socket context turns the "cooldown" refusal into this message.
		gameMocks.submit.mockRejectedValue(new Error('Your team just submitted. Wait a few seconds before submitting again.'));
		await renderPlayingGame();

		await userEvent.click(screen.getByRole('button', { name: 'Submit' }));

		expect(await screen.findByText('Your team just submitted. Wait a few seconds before submitting again.')).toBeTruthy();
	});

	it('US-6-T-6 runs the code against CodeService like practice', async () => {
		const fetchMock = stubCodeService();
		await renderPlayingGame();

		await userEvent.click(screen.getByRole('button', { name: 'Run' }));

		// Run goes straight to CodeService's POST /solution, as in practice.
		await waitFor(() => expect(requestsOf(fetchMock).some((request) => request.url === `${CODE_URL}/solution` && request.method === 'POST')).toBe(true));
	});

	it('US-6-T-6 sends edited code to the game for the player\'s team', async () => {
		await renderPlayingGame();

		fireEvent.change(screen.getByTestId('monaco'), { target: { value: 'print(1)' } });

		// Sent for question 1 with the edited code in its open tab (debounced, so wait for it).
		await waitFor(() => expect(gameMocks.shareCode).toHaveBeenCalledWith(1, expect.objectContaining({
			tabs: [expect.objectContaining({ code: 'print(1)' })],
		})));
	});

	it('US-6-T-6 never opens a lobby socket for the editor in a match', async () => {
		await renderPlayingGame();

		fireEvent.change(screen.getByTestId('monaco'), { target: { value: 'print(1)' } });
		await waitFor(() => expect(gameMocks.shareCode).toHaveBeenCalled());

		// Code only leaves through the game (team-only); the lobby socket would reach both teams.
		expect(gameMocks.io).not.toHaveBeenCalled();
	});
});

// A teammate's workspace for one question: their tabs and which one is open,
// as GameService relays and snapshots it on "game:code" / "game:code:snapshot".
function workspace(code: string, tabs = [{ id: 'tab-1', name: 'Tab 1', code }]) {
	return { tabs, activeTabId: tabs[0].id };
}

describe('game page workspace switcher', () => {
	async function renderPlayingGame(teammateCode: Record<string, unknown> = {}) {
		configureConnectedGame({}, teammateCode);
		render(<GamePage />);
		await screen.findByRole('heading', { name: /1\. Problem Number 1/ });
	}

	it('US-6-T-7 shows a "You" tab and one tab per teammate while playing', async () => {
		await renderPlayingGame();

		const switcher = screen.getByRole('tablist', { name: 'Workspace' });
		expect(within(switcher).getAllByRole('tab').map((tab) => tab.textContent)).toEqual(['You', 'Grace', 'Katherine']);
	});

	it('US-6-T-7 never shows a workspace tab for a player on the other team', async () => {
		await renderPlayingGame();

		expect(screen.queryByRole('tab', { name: 'Alan' })).toBeNull();
	});

	it('US-6-T-7 selects "You" by default', async () => {
		await renderPlayingGame();

		expect(screen.getByRole('tab', { name: 'You' }).getAttribute('aria-selected')).toBe('true');
	});

	it('US-6-T-7 does not show the workspace switcher while banning', () => {
		const banPool = problemPool.map((entry) => ({ ...entry, topics: ['Array'], bannedBy: null }));
		configureConnectedGame({ phase: 'banning', banSecondsRemaining: 25, problemPool: banPool });
		render(<GamePage />);

		expect(screen.queryByRole('tablist', { name: 'Workspace' })).toBeNull();
	});

	it('US-6-T-7 does not show the workspace switcher while waiting for players', () => {
		configureConnectedGame({ phase: 'waiting' });
		render(<GamePage />);

		expect(screen.queryByRole('tablist', { name: 'Workspace' })).toBeNull();
	});
});

describe('game page teammate workspace view', () => {
	async function renderPlayingGame(teammateCode: Record<string, unknown> = {}) {
		configureConnectedGame({}, teammateCode);
		render(<GamePage />);
		await screen.findByRole('heading', { name: /1\. Problem Number 1/ });
	}

	it('US-6-T-7 restores your own editable tabs and code after switching back from a teammate', async () => {
		await renderPlayingGame({ u2: { 2: workspace('teammate code') } });
		fireEvent.change(screen.getByTestId('monaco'), { target: { value: 'my own code' } });
		await userEvent.click(screen.getByRole('tab', { name: 'Grace' }));

		await userEvent.click(screen.getByRole('tab', { name: 'You' }));

		expect((screen.getByTestId('monaco') as HTMLTextAreaElement).value).toBe('my own code');
	});

	it('US-6-T-7 never replaces your own code with a teammate\'s shared code for the same question', async () => {
		await renderPlayingGame({ u2: { 1: workspace('teammate code for question 1') } });

		expect((screen.getByTestId('monaco') as HTMLTextAreaElement).value).not.toBe('teammate code for question 1');
	});

	it('US-6-T-7 shows the question a teammate is currently on', async () => {
		await renderPlayingGame({ u2: { 2: workspace('teammate code') } });

		await userEvent.click(screen.getByRole('tab', { name: 'Grace' }));

		expect(await screen.findByRole('heading', { name: /2\. Problem Number 2/ })).toBeTruthy();
	});

	it('US-6-T-7 shows a teammate\'s current tabs', async () => {
		await renderPlayingGame({
			u2: { 2: workspace('', [{ id: 'tab-1', name: 'Tab 1', code: 'a' }, { id: 'tab-2', name: 'Tab 2', code: 'b' }]) },
		});

		await userEvent.click(screen.getByRole('tab', { name: 'Grace' }));

		expect(screen.getAllByRole('tab', { name: /^Tab \d$/ }).map((tab) => tab.textContent)).toEqual(['Tab 1', 'Tab 2']);
	});

	it('US-6-T-7 does not accept input in a teammate\'s editor', async () => {
		await renderPlayingGame({ u2: { 2: workspace('teammate code') } });

		await userEvent.click(screen.getByRole('tab', { name: 'Grace' }));

		expect((screen.getByTestId('monaco') as HTMLTextAreaElement).readOnly).toBe(true);
	});

	it('US-6-T-7 does not show a "Create new tab" button for a teammate', async () => {
		await renderPlayingGame({ u2: { 2: workspace('teammate code') } });

		await userEvent.click(screen.getByRole('tab', { name: 'Grace' }));

		expect(screen.queryByRole('button', { name: 'Create new tab' })).toBeNull();
	});

	it('US-6-T-7 does not open a context menu on right-click in a teammate\'s tab strip', async () => {
		await renderPlayingGame({ u2: { 2: workspace('teammate code') } });
		await userEvent.click(screen.getByRole('tab', { name: 'Grace' }));

		fireEvent.contextMenu(screen.getByRole('tab', { name: 'Tab 1' }));

		expect(screen.queryByRole('menu')).toBeNull();
	});

	it('US-6-T-7 shows a teammate\'s other tab when clicked, still read only', async () => {
		await renderPlayingGame({
			u2: { 2: workspace('', [{ id: 'tab-1', name: 'Tab 1', code: 'first tab code' }, { id: 'tab-2', name: 'Tab 2', code: 'second tab code' }]) },
		});
		await userEvent.click(screen.getByRole('tab', { name: 'Grace' }));

		await userEvent.click(screen.getByRole('tab', { name: 'Tab 2' }));

		expect((screen.getByTestId('monaco') as HTMLTextAreaElement).value).toBe('second tab code');
	});

	it('US-6-T-7 updates the read-only view live when the teammate shares new code', async () => {
		configureConnectedGame({}, { u2: { 2: workspace('first version') } });
		const { rerender } = render(<GamePage />);
		await screen.findByRole('heading', { name: /1\. Problem Number 1/ });
		await userEvent.click(screen.getByRole('tab', { name: 'Grace' }));
		configureConnectedGame({}, { u2: { 2: workspace('second version') } });

		rerender(<GamePage />);

		expect((screen.getByTestId('monaco') as HTMLTextAreaElement).value).toBe('second version');
	});

	it('US-6-T-7 shows a teammate\'s starter code for the question they\'re on when they haven\'t shared any', async () => {
		await renderPlayingGame({});

		await userEvent.click(screen.getByRole('tab', { name: 'Grace' }));

		expect((screen.getByTestId('monaco') as HTMLTextAreaElement).value).toBe(makeProblem(1, 'Easy').starter_code.replaceAll('\\n', '\n'));
	});

	it('US-6-T-7 lets you view a teammate\'s other match questions', async () => {
		await renderPlayingGame({
			u2: { 1: workspace('question 1 code for teammate'), 2: workspace('question 2 code for teammate') },
		});
		await userEvent.click(screen.getByRole('tab', { name: 'Grace' }));

		await userEvent.click(screen.getByRole('button', { name: '2' }));

		expect((screen.getByTestId('monaco') as HTMLTextAreaElement).value).toBe('question 2 code for teammate');
	});
});

describe('game page team chat', () => {
	it('US-3-T-2 shows a "Team chat" panel while the game is playing', async () => {
		configureConnectedGame();
		render(<GamePage />);

		expect(await screen.findByRole('region', { name: 'Team chat' })).toBeTruthy();
	});

	it('US-3-T-2 emits chat:send on the game socket when a comment is sent from the match page', async () => {
		const user = userEvent.setup();
		// Keep hold of the socket so the test can see what was emitted on it.
		const socket = { connected: true, emit: vi.fn(), on: vi.fn(), off: vi.fn() };
		configureGame({ socket, connected: true, game: gameState() });
		render(<GamePage />);

		await user.type(await screen.findByRole('textbox', { name: 'Message your team' }), 'Question 1 is done');
		await user.click(screen.getByRole('button', { name: 'Send' }));

		// The editor also sends game:code on this socket, so only chat:send is checked.
		const chatSends = socket.emit.mock.calls.filter(([event]) => event === 'chat:send');
		expect(chatSends.map((call) => call.slice(0, 2))).toEqual([['chat:send', { text: 'Question 1 is done' }]]);
	});
});

// Sprint 4 polish (pseudocode: test/sprint4-polish-test-pseudo.md).
//  - While the game page is joining the match, it should show a spinner
//  - The game page should play no loader while banning, picking or playing
//    (the match starts right after the lobby's team clash)
//  - The result screen puts the user's team first, as "Your team" in the primary
//    color, even when they are on team b
describe('game page sprint 4 polish', () => {
	// The page's loader animation, or null when none is playing.
	const loader = () => document.querySelector('[data-loader]');

	// The default roster with the teams swapped: Ada (u1, the signed-in user) is on team b.
	const swappedRoster = roster.map((entry) => ({ ...entry, team: entry.team === 'a' ? 'b' : 'a' }));

	it('shows a spinner while joining the match', () => {
		configureGame();
		render(<GamePage />);

		expect(screen.queryByTestId('spinner')).not.toBeNull();
	});

	it('plays no loader while banning', () => {
		configureConnectedGame({ phase: 'banning', startedAt: null, banSecondsRemaining: 25, problemPool: problemPool.map((entry) => ({ ...entry, topics: ['Array'], bannedBy: null })) });
		render(<GamePage />);

		expect(loader()).toBeNull();
	});

	it('plays no loader while picking', () => {
		configureConnectedGame({ phase: 'picking', startedAt: null, pickSecondsRemaining: 25, problemPool: problemPool.map((entry) => ({ ...entry, topics: ['Array'], pickedBy: { a: null, b: null } })) });
		render(<GamePage />);

		expect(loader()).toBeNull();
	});

	it('plays no loader once the match is playing', () => {
		configureConnectedGame();
		render(<GamePage />);

		expect(loader()).toBeNull();
	});

	it('puts the user\'s half first on the result screen when they are on team b', () => {
		configureGame({ connected: false, game: gameState({ players: swappedRoster }), result: { winner: 'b', reason: 'time' } });
		render(<GamePage />);

		expect(screen.getAllByRole('region').map((region) => region.getAttribute('aria-label'))).toEqual(['Your team', 'Rival team']);
	});

	it('colors "Your team" with the primary color when the user is on team b', () => {
		configureGame({ connected: false, game: gameState({ players: swappedRoster }), result: { winner: 'b', reason: 'time' } });
		render(<GamePage />);

		expect(within(screen.getByRole('region', { name: 'Your team' })).getByRole('heading', { name: 'Your team' }).className).toContain('text-primary');
	});

	it('says "Your team wins" when the user\'s team wins', () => {
		configureGame({ connected: false, game: gameState(), result: { winner: 'a', reason: 'time' } });
		render(<GamePage />);

		expect(screen.getByRole('heading', { name: 'Your team wins' })).toBeTruthy();
	});

	it('shows the user\'s own score in their half when they are on team b', () => {
		reduceMotion();
		configureGame({ connected: false, game: gameState({ players: swappedRoster, scores: { a: 100, b: 250 } }), result: { winner: 'b', reason: 'time' } });
		render(<GamePage />);

		expect(within(screen.getByRole('region', { name: 'Your team' })).getByTestId('final-score').textContent).toBe('250');
	});
});

// "Reduce motion" on, so the result scores show their final number at once.
function reduceMotion() {
	vi.stubGlobal('matchMedia', (query: string) => ({
		matches: query === '(prefers-reduced-motion: reduce)',
		media: query,
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
	}));
}
