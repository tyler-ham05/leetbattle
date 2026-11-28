// Match screens polish (US-5-T-22): the player's own team comes first, on the
// left and in the primary color, from the lobby through the ban and pick
// screens; the ban and pick screens lose their dots, pips and pills; a ban
// strikes through its card; the pre-match header drops the score; the match
// clock turns red under a minute; and leftover copy and code are tidied.
// Pseudocode these tests were written from: test/match-screens-polish-test-pseudo.md
//
// Nothing here talks to a backend: auth, the lobby socket and the game socket
// are fakes, CodeService and AuthService are stubbed with a fake fetch, and
// the ban / pick screens are fed mocked pools as props.
import fs from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fakeUser, jsonResponse, makeProblem, stubFetch } from './helpers';

const mocks = vi.hoisted(() => ({
	useLobbySocket: vi.fn(),
	useGameSocket: vi.fn(),
	refresh: vi.fn(),
	logout: vi.fn(),
	// socket.io-client's io(): nothing in these tests may open a real socket.
	io: vi.fn(),
}));

// Monaco needs a real browser; a textarea with the same contract stands in.
vi.mock('@monaco-editor/react', () => ({
	default: ({ value, onChange }: { value: string; onChange?: (_v: string) => void }) => (
		<textarea data-testid="monaco" value={value} onChange={(e) => onChange?.(e.target.value)} />
	),
}));
vi.mock('socket.io-client', () => ({ io: (...args: unknown[]) => mocks.io(...args) }));
vi.mock('next/navigation', () => ({
	useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
	// The game page under test is always /game/game-1.
	useParams: () => ({ gameId: 'game-1' }),
}));
// The signed-in user is always u1, "Ada" (fakeUser).
vi.mock('../app/login/context', () => ({
	useAuth: () => ({ user: fakeUser, isLoading: false, refresh: mocks.refresh, logout: mocks.logout }),
}));
// Only the lobby page's hook is faked; the editor's optional lookup keeps the real module.
vi.mock('../app/lobby/socket-context', async (importOriginal) => ({
	...(await importOriginal<typeof import('../app/lobby/socket-context')>()),
	useLobbySocket: () => mocks.useLobbySocket(),
}));
vi.mock('../app/game/socket-context', () => ({
	GameSocketProvider: ({ children }: { children: React.ReactNode }) => children,
	useGameSocket: () => mocks.useGameSocket(),
}));

import LobbyPage from '../app/lobby/page';
import GamePage from '../app/game/[gameId]/page';
import BanScreen from '../app/game/components/ban-screen';
import PickScreen from '../app/game/components/pick-screen';
import SettingsPage from '../app/settings/page';
import HomeActions from '../app/_home/components/home-actions';

type TeamId = 'a' | 'b';

const css = fs.readFileSync(path.resolve(__dirname, '../app/globals.css'), 'utf8');
const homeComponents = path.resolve(__dirname, '../app/_home/components');

// ---------------------------------------------------------------- lobby

function lobbyPlayer(userId: string, displayName: string, team: TeamId | null) {
	return { userId, displayName, team, connected: true, ready: false };
}

// Ada (u1, the signed-in user) sits on team b with Alan; Grace is on team a.
const adaOnB = [lobbyPlayer('u2', 'Grace', 'a'), lobbyPlayer('u1', 'Ada', 'b'), lobbyPlayer('u4', 'Alan', 'b')];
// A full 3v3 the signed-in user is not part of.
const fullWithoutAda = [
	lobbyPlayer('u2', 'Grace', 'a'), lobbyPlayer('u3', 'Katherine', 'a'), lobbyPlayer('u7', 'Barbara', 'a'),
	lobbyPlayer('u4', 'Alan', 'b'), lobbyPlayer('u5', 'Edsger', 'b'), lobbyPlayer('u6', 'Margaret', 'b'),
];

// Sets what the lobby socket returns for the next render.
function configureLobby(players: ReturnType<typeof lobbyPlayer>[]) {
	mocks.useLobbySocket.mockReturnValue({
		socket: { connected: true, emit: vi.fn() },
		connected: true,
		lobby: {
			players,
			playerCount: players.length,
			readyCount: 0,
			canReady: false,
			readyToStart: false,
			countdownSecondsRemaining: null,
			teamSize: 3,
			hostId: 'u2',
		},
		error: null,
		matchReadiness: null,
		gameStarted: null,
		connect: vi.fn(),
		clearError: vi.fn(),
	});
}

// The team headings, left to right.
function teamHeadings() {
	return screen.getAllByRole('heading', { level: 2 });
}

// ---------------------------------------------------------------- game page

function gamePlayer(userId: string, displayName: string, team: TeamId) {
	return { userId, displayName, team, connected: true };
}

// A 2v2 with Ada (u1) on team b alongside Alan; Grace and Katherine on team a.
const gameRosterAdaOnB = [
	gamePlayer('u2', 'Grace', 'a'),
	gamePlayer('u3', 'Katherine', 'a'),
	gamePlayer('u1', 'Ada', 'b'),
	gamePlayer('u4', 'Alan', 'b'),
];
// The same 2v2 with Ada on team a, so Grace is her teammate.
const gameRosterAdaOnA = [
	gamePlayer('u1', 'Ada', 'a'),
	gamePlayer('u2', 'Grace', 'a'),
	gamePlayer('u4', 'Alan', 'b'),
	gamePlayer('u5', 'Edsger', 'b'),
];

const banPool = [1, 2, 3, 4, 5].map((questionId) => ({
	taskId: `task-${questionId}`, questionId, difficulty: 'Easy', topics: ['Array'], votes: [], pickedBy: { a: null, b: null },
}));
const pickPool = [1, 2].map((questionId) => ({
	taskId: `task-${questionId}`, questionId, difficulty: 'Easy', topics: ['Array'], votes: [], pickedBy: { a: null, b: null },
}));
const playPool = [1, 2].map((questionId) => ({ taskId: `task-${questionId}`, questionId, difficulty: 'Easy' }));

// Sets what the game socket returns: connected, with the given game state.
function configureGame(overrides: Record<string, unknown> = {}) {
	mocks.useGameSocket.mockReturnValue({
		socket: { connected: true, emit: vi.fn(), on: vi.fn(), off: vi.fn() },
		connected: true,
		game: {
			gameId: 'game-1',
			phase: 'banning',
			startedAt: null,
			secondsRemaining: 20 * 60,
			banSecondsRemaining: 25,
			pickSecondsRemaining: 25,
			scores: { a: 0, b: 0 },
			bans: { perTeam: 1, questionsInPlay: 3, votesCast: 0, voters: 2, revealSecondsRemaining: 0, banned: [] },
			problemPool: banPool,
			players: gameRosterAdaOnB,
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
		teammateCode: {},
	});
}

// The page's own content below the top bar.
function main() {
	return screen.getByRole('main');
}

// ---------------------------------------------------------------- ban / pick screens

const ADA_B = { userId: 'u1', displayName: 'Ada', team: 'b' as TeamId };
const ALAN_B = { userId: 'u4', displayName: 'Alan', team: 'b' as TeamId };

// The ban reveal (US-8-T-1): team b banned the question in place 2 and team a
// the one in place 3, so both are out of the pool but still shown where they
// were. Questions 1, 4 and 5 are the ones left in play.
const revealPool = banPool.filter((entry) => ![2, 3].includes(entry.questionId));
const revealBans = {
	perTeam: 1,
	questionsInPlay: 3,
	votesCast: 0,
	voters: 2,
	revealSecondsRemaining: 3,
	banned: [
		{ taskId: 'task-2', questionId: 2, difficulty: 'Easy', topics: ['Array'], team: 'b' as TeamId, position: 2 },
		{ taskId: 'task-3', questionId: 3, difficulty: 'Easy', topics: ['Array'], team: 'a' as TeamId, position: 3 },
	],
};

function renderBan(myTeam: TeamId = 'b') {
	return render(<BanScreen problems={revealPool} bans={revealBans} myTeam={myTeam} onVote={vi.fn()} />);
}

// Two questions; Alan (Ada's team b teammate) picked the first.
const pickedPool = pickPool.map((entry) => (entry.questionId === 1 ? { ...entry, pickedBy: { a: null, b: ALAN_B } } : entry));

function renderPick() {
	return render(<PickScreen problems={pickedPool} teamSize={2} myTeam="b" onPick={vi.fn()} onUnpick={vi.fn()} />);
}

// The list item for the question in the given position (1-based).
function questionCard(position: number) {
	return screen.getAllByRole('listitem')[position - 1];
}

// Every @keyframes block in globals.css, as text.
function keyframeBlock(name: string) {
	return (css.match(/@keyframes[^{]*\{(?:[^{}]*\{[^}]*\})*[^}]*\}/g) ?? []).find((block) => block.startsWith(`@keyframes ${name} `)) ?? '';
}

// The prefers-reduced-motion block(s) in globals.css, joined.
const reducedMotion = css.split('@media (prefers-reduced-motion: reduce)').slice(1).join('\n');

beforeEach(() => {
	vi.clearAllMocks();
	vi.unstubAllGlobals();
	localStorage.clear();
	localStorage.setItem('authToken', 'tok123');
	// A playing match's editor loads questions from CodeService: fake it.
	stubFetch((url) => jsonResponse(makeProblem(Number(url.split('/').pop()), 'Easy')));
});

afterEach(() => cleanup());

describe('lobby: your team on the left, in the primary color', () => {
	// US-4-T-9: sides stay put, so team b stays on the right even for its own players.
	it('shows "Your team" as the second heading to a player on team b', () => {
		configureLobby(adaOnB);
		render(<LobbyPage />);
		expect(teamHeadings()[1].textContent).toBe('Your team');
	});

	it('colors "Your team" with the primary color for a player on team b', () => {
		configureLobby(adaOnB);
		render(<LobbyPage />);
		expect(screen.getByRole('heading', { name: 'Your team' }).className).toContain('text-primary');
	});

	it('shows "Rival team" as the first heading to a player on team b', () => {
		configureLobby(adaOnB);
		render(<LobbyPage />);
		expect(teamHeadings()[0].textContent).toBe('Rival team');
	});

	it('colors "Rival team" with the secondary color for a player on team b', () => {
		configureLobby(adaOnB);
		render(<LobbyPage />);
		expect(screen.getByRole('heading', { name: 'Rival team' }).className).toContain('text-secondary');
	});

	it('keeps Team 1\'s bar first for a team b player', () => {
		configureLobby(adaOnB);
		render(<LobbyPage />);
		// US-4-T-9: the first bar above the arena is always Team 1's.
		expect(document.querySelector('[data-team-bar]')?.getAttribute('data-team-bar')).toBe('a');
	});

	it('lists the team b player in the first team\'s list', () => {
		configureLobby(adaOnB);
		render(<LobbyPage />);
		// Ada's own list is "Your team players", now on the right (US-4-T-9).
		expect(within(screen.getByRole('list', { name: 'Your team players' })).queryByText('Ada')).not.toBeNull();
	});

	it('still shows "Team 1" then "Team 2" to someone watching a lobby they have not joined', () => {
		configureLobby(fullWithoutAda);
		render(<LobbyPage />);
		expect(teamHeadings().map((heading) => heading.textContent)).toEqual(['Team 1', 'Team 2']);
	});
});

describe('game page before play: your team first', () => {
	it('shows "Your team" as the first roster heading to a player on team b while banning', () => {
		configureGame();
		render(<GamePage />);
		// Roster headings come before the ban screen's own heading.
		expect(within(main()).getAllByRole('heading', { level: 2 })[0].textContent).toBe('Your team');
	});

	it('colors the "Your team" roster heading with the primary color for a player on team b', () => {
		configureGame();
		render(<GamePage />);
		expect(screen.getByRole('heading', { name: 'Your team' }).className).toContain('text-primary');
	});

	it('shows "Rival team" as the second roster heading to a player on team b while banning', () => {
		configureGame();
		render(<GamePage />);
		expect(within(main()).getAllByRole('heading', { level: 2 })[1].textContent).toBe('Rival team');
	});

	it('colors the "Rival team" roster heading with the secondary color for a player on team b', () => {
		configureGame();
		render(<GamePage />);
		expect(screen.getByRole('heading', { name: 'Rival team' }).className).toContain('text-secondary');
	});

	it('lists the team b player in the "Your team players" list', () => {
		configureGame();
		render(<GamePage />);
		expect(within(screen.getByRole('list', { name: 'Your team players' })).queryByText('Ada')).not.toBeNull();
	});

	it('names the rosters "Your team" then "Rival team" while waiting for players', () => {
		configureGame({ phase: 'waiting' });
		render(<GamePage />);
		expect(within(main()).getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent)).toEqual(['Your team', 'Rival team']);
	});
});

describe('pre-match header: no score, only the phase clock', () => {
	it('shows no "0 – 0" while waiting for players', () => {
		configureGame({ phase: 'waiting' });
		render(<GamePage />);
		expect(main().textContent).not.toContain('0 – 0');
	});

	it('shows no "0 – 0" while banning', () => {
		configureGame();
		render(<GamePage />);
		expect(main().textContent).not.toContain('0 – 0');
	});

	it('shows no "0 – 0" while picking', () => {
		configureGame({ phase: 'picking', problemPool: pickPool });
		render(<GamePage />);
		expect(main().textContent).not.toContain('0 – 0');
	});

	it('still shows the ban clock while banning', () => {
		configureGame();
		render(<GamePage />);
		// 25 seconds left to ban.
		expect(screen.getByText('0:25')).toBeTruthy();
	});
});

describe('match clock under one minute', () => {
	it('turns the clock to the danger color with 59 seconds left', () => {
		configureGame({ phase: 'playing', startedAt: Date.now(), secondsRemaining: 59, problemPool: playPool });
		render(<GamePage />);
		expect(screen.getByText('0:59').className).toContain('text-danger');
	});

	it('keeps the clock out of the danger color with 60 seconds left', () => {
		configureGame({ phase: 'playing', startedAt: Date.now(), secondsRemaining: 60, problemPool: playPool });
		render(<GamePage />);
		expect(screen.getByText('1:00').className).not.toContain('text-danger');
	});
});

describe('connected teammates next to Forfeit', () => {
	// Ada is on team a, so Grace is her one connected teammate.
	function graceInTopBar() {
		configureGame({ phase: 'playing', startedAt: Date.now(), problemPool: playPool, players: gameRosterAdaOnA });
		render(<GamePage />);
		return within(within(screen.getAllByRole('banner')[0]).getByRole('list', { name: 'Teammates' })).getByRole('listitem');
	}

	it('does not show a teammate\'s name as a pill', () => {
		expect(graceInTopBar().className).not.toContain('rounded-full');
	});

	it('shows a teammate\'s name with no border', () => {
		expect(graceInTopBar().className).not.toMatch(/\bborder\b/);
	});

	it('shows a teammate\'s name in the muted color', () => {
		expect(graceInTopBar().className).toContain('text-muted');
	});
});

describe('ban screen', () => {
	it('colors the viewer\'s own team\'s ban with the primary color when viewed from team b', () => {
		renderBan('b');
		// Team b banned question 2, and team b is the viewer's own team.
		expect(screen.getByText('Your team').className).toContain('text-primary');
	});

	it('colors the other team\'s ban with the secondary color when viewed from team b', () => {
		renderBan('b');
		// Team a banned question 3, the rival team from team b's side.
		expect(screen.getByText('Rival team').className).toContain('text-secondary');
	});

	it('does not show the "Team 1" legend', () => {
		renderBan();
		expect(screen.queryByText('Team 1')).toBeNull();
	});

	it('does not show the "Team 2" legend', () => {
		renderBan();
		expect(screen.queryByText('Team 2')).toBeNull();
	});

	it('shows no progress pips', () => {
		const { container } = renderBan();
		expect(container.querySelectorAll('[data-seat]')).toHaveLength(0);
	});

	it('shows no dots or pills', () => {
		const { container } = renderBan();
		expect(container.querySelectorAll('.rounded-full')).toHaveLength(0);
	});

	it('shows each topic as a flat rounded-md label', () => {
		renderBan();
		expect(screen.getAllByTestId('topic')[0].className).toContain('rounded-md');
	});

	it('strikes a line across a banned question\'s card', () => {
		renderBan();
		// Question 2 was banned by Alan.
		expect(within(questionCard(2)).queryByTestId('ban-strike')).not.toBeNull();
	});

	it('draws no strike line on an open question', () => {
		renderBan();
		// Question 1 is still open.
		expect(within(questionCard(1)).queryByTestId('ban-strike')).toBeNull();
	});

	it('animates only transform in the strike line\'s keyframes', () => {
		// Every property set inside the lb-ban-strike keyframes.
		const properties = [...keyframeBlock('lb-ban-strike').replace(/^@keyframes[^{]*\{/, '').matchAll(/([a-z-]+)\s*:/g)].map((match) => match[1]);
		expect(new Set(properties)).toEqual(new Set(['transform']));
	});

	it('turns the strike line off with reduced motion', () => {
		expect(reducedMotion).toContain('.lb-ban-strike');
	});
});

describe('pick screen', () => {
	it('shows no progress pips', () => {
		const { container } = renderPick();
		expect(container.querySelectorAll('[data-seat]')).toHaveLength(0);
	});

	it('shows no dots or pills', () => {
		const { container } = renderPick();
		expect(container.querySelectorAll('.rounded-full')).toHaveLength(0);
	});

	it('shows the question\'s title instead of a topic label', () => {
		// The pick screen shows titles now, not the topic pills the ban screen keeps.
		renderPick();
		expect(screen.queryAllByTestId('topic')).toHaveLength(0);
	});

	it('has no "--" in its intro', () => {
		renderPick();
		expect(screen.getByText(/questions are left after the bans/).textContent).not.toContain('--');
	});

	it('says "Your teammates can\'t pick the ones you choose."', () => {
		// US-8-2 lets a player pick more than one, so the copy no longer
		// promises just "the one you choose".
		renderPick();
		expect(screen.getByText(/questions are left after the bans/).textContent).toContain('Your teammates can\'t pick the ones you choose.');
	});

	it('colors a teammate\'s "Picked by" name with the primary color when viewed from team b', () => {
		renderPick();
		// The viewer's own team is always the primary color.
		expect(screen.getByText('Alan').className).toContain('text-primary');
	});

	it('still names the viewer "you" on their own pick', () => {
		render(<PickScreen problems={pickPool.map((entry) => (entry.questionId === 1 ? { ...entry, pickedBy: { a: null, b: ADA_B } } : entry))} teamSize={2} myTeam="b" onPick={vi.fn()} onUnpick={vi.fn()} />);
		expect(questionCard(1).textContent).toContain('Picked by you');
	});
});

describe('copy', () => {
	it('says "This lobby is full" with no period to someone outside a full lobby', () => {
		configureLobby(fullWithoutAda);
		render(<LobbyPage />);
		expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('This lobby is full');
	});

	// US-4-T-9: the headline before joining became "Pick a seat to join".
	it('says "Pick a seat to join" with no period', () => {
		configureLobby(fullWithoutAda.slice(1));
		render(<LobbyPage />);
		expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Pick a seat to join');
	});

	// The match page has no subtitle under "Match" (the user found it read as filler).
	it('shows no subtitle under the match heading', () => {
		configureGame();
		render(<GamePage />);
		expect(screen.queryByText(/Two teams, the same problems/)).toBeNull();
	});

	it('says "Name updated" with no period', async () => {
		stubFetch(() => jsonResponse({ user: { ...fakeUser, name: 'Grace' } }));
		render(<SettingsPage />);
		await userEvent.click(screen.getByRole('button', { name: 'Save name' }));
		expect(await screen.findByText('Name updated')).toBeTruthy();
	});

	it('says "Password changed" with no period', async () => {
		stubFetch(() => jsonResponse({}));
		render(<SettingsPage />);
		await userEvent.type(screen.getByLabelText('Current password'), 'old-password');
		await userEvent.type(screen.getByLabelText('New password'), 'new-password-1');
		await userEvent.click(screen.getByRole('button', { name: 'Change password' }));
		expect(await screen.findByText('Password changed')).toBeTruthy();
	});

	it('starts a lowercase server error on saving the name with a capital letter', async () => {
		// AuthService sends its errors in lowercase.
		stubFetch(() => jsonResponse({ error: 'name too long' }, 400));
		render(<SettingsPage />);
		await userEvent.click(screen.getByRole('button', { name: 'Save name' }));
		expect(await screen.findByText('Name too long')).toBeTruthy();
	});

	it('starts a lowercase server error on changing the password with a capital letter', async () => {
		stubFetch(() => jsonResponse({ error: 'current password is incorrect' }, 403));
		render(<SettingsPage />);
		await userEvent.type(screen.getByLabelText('Current password'), 'guess');
		await userEvent.type(screen.getByLabelText('New password'), 'new-password-1');
		await userEvent.click(screen.getByRole('button', { name: 'Change password' }));
		expect(await screen.findByText('Current password is incorrect')).toBeTruthy();
	});

	it('does not say "six-player" on the home menu\'s Lobby line', () => {
		render(<HomeActions />);
		expect(screen.getByRole('link', { name: /Lobby/ }).textContent).not.toMatch(/six/i);
	});
});

describe('unused code is gone', () => {
	it('has no home-wheel.tsx', () => {
		expect(fs.existsSync(path.join(homeComponents, 'home-wheel.tsx'))).toBe(false);
	});

	it('has no home-menu.tsx', () => {
		expect(fs.existsSync(path.join(homeComponents, 'home-menu.tsx'))).toBe(false);
	});

	it('no longer defines .lb-seat-pip in globals.css', () => {
		expect(css).not.toContain('.lb-seat-pip');
	});
});
