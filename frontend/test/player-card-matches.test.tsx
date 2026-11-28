// US-7-T-5: the "Last 10 matches" rating line, the dev-only demo panel and
// the card's shadow on the page.
// Pseudocode: test/player-card-test-pseudo.md, "Last 10 matches",
// "Demo panel" and "Card depth".
//
// No test reaches AuthService: the auth context (GET /me) is a fake that
// hands back `mocks.user`, and AuthAPIService is a class whose calls are
// vi.fn()s, so a test can check the demo panel never calls any of them.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fakeUser } from './helpers';

const DAY_MS = 24 * 60 * 60 * 1000;
// An ISO time `days` calendar days before now (0 is now).
const daysAgo = (days: number) => new Date(Date.now() - days * DAY_MS).toISOString();

// Five ranked matches, oldest first: W +16, L −15, W +20, W +25, W +16, from
// 622 up to 684 (net +62). The last one is a 2v2 played today.
const fiveMatches = [
	{ result: 'W', change: 16, ratingAfter: 638, teamSize: 1, playedAt: daysAgo(4) },
	{ result: 'L', change: -15, ratingAfter: 623, teamSize: 3, playedAt: daysAgo(3) },
	{ result: 'W', change: 20, ratingAfter: 643, teamSize: 2, playedAt: daysAgo(2) },
	{ result: 'W', change: 25, ratingAfter: 668, teamSize: 1, playedAt: daysAgo(1) },
	{ result: 'W', change: 16, ratingAfter: 684, teamSize: 2, playedAt: daysAgo(0) },
];

// Ten matches that alternate W/L (+15/−15), ending on a win at 684.
const tenMatches = Array.from({ length: 10 }, (_, i) => ({
	result: i % 2 ? 'W' : 'L', change: i % 2 ? 15 : -15, ratingAfter: i % 2 ? 684 : 669, teamSize: 1, playedAt: daysAgo(10 - i),
}));

// The signed-in player as GET /me returns them: Gold I at 684, 24-17-3.
const goldUser = {
	...fakeUser,
	rating: 684, league: 'Gold I', leagueMin: 600, nextLeague: { name: 'Gold II', at: 700 } as { name: string; at: number } | null,
	wins: 24, losses: 17, draws: 3,
	icon: 'katana', description: '', picture: null as string | null,
	recentMatches: fiveMatches as unknown[] | undefined,
};

// Another player's public profile from GET /users/:id.
const grace = {
	id: 'u2', name: 'Grace', icon: 'bolt', description: '', picture: null,
	rating: 120, league: 'Bronze II', leagueMin: 100, nextLeague: { name: 'Bronze III', at: 200 },
	wins: 1, losses: 0, draws: 0, createdAt: '2026-03-04T00:00:00Z',
	recentMatches: [{ result: 'W', change: 18, ratingAfter: 120, teamSize: 1, playedAt: daysAgo(0) }],
};

const mocks = vi.hoisted(() => ({
	user: null as unknown,
	params: { id: 'u2' } as Record<string, string>,
	refresh: vi.fn(),
	getUser: vi.fn(),
	updateProfile: vi.fn(),
	setPicture: vi.fn(),
	removePicture: vi.fn(),
}));

vi.mock('next/navigation', () => ({
	useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
	useParams: () => mocks.params,
}));
vi.mock('../app/login/context', () => ({
	useAuth: () => ({ user: mocks.user, isLoading: false, logout: vi.fn(), refresh: mocks.refresh }),
}));
// Every AuthAPIService call the profile pages make is a mock.
vi.mock('../app/login/controller', () => ({
	AuthAPIService: class {
		getUser = mocks.getUser;
		updateProfile = mocks.updateProfile;
		setPicture = mocks.setPicture;
		removePicture = mocks.removePicture;
	},
}));

import ProfilePage from '../app/profile/page';
import OtherProfilePage from '../app/profile/[id]/page';
import { demoLeagueFor } from '../app/profile/components/demo-leagues';

// Signs in as `overrides` on top of the Gold I player and opens /profile.
function openOwn(overrides: Partial<typeof goldUser> = {}) {
	mocks.user = { ...goldUser, ...overrides };
	return render(<ProfilePage />);
}

// The "Last 10 matches" section, and the matches in its chart.
const section = () => screen.getByRole('region', { name: 'Last 10 matches' });
const matches = () => within(section()).getAllByRole('listitem');
// The rating as the page tells screen readers ("Rating 684"), as a number.
const shownRating = () => Number(screen.getByText(/^Rating \d+$/).textContent?.replace('Rating ', ''));
const demoPanel = () => screen.queryByRole('group', { name: 'Demo' });

beforeEach(() => {
	vi.clearAllMocks();
	mocks.params = { id: 'u2' };
	mocks.getUser.mockResolvedValue(grace);
});
afterEach(() => {
	cleanup();
	vi.unstubAllEnvs();
});

describe('US-7-T-5 last 10 matches: the header', () => {
	it('US-7-T-5 has a "Last 10 matches" section on your own profile', () => {
		openOwn();
		expect(section()).toBeTruthy();
	});

	// W, L, W, W, W: the last three are wins.
	it('US-7-T-5 reads the winning streak ("3 wins in a row")', () => {
		openOwn();
		expect(screen.getByTestId('form-streak').textContent).toBe('3 wins in a row');
	});

	it('US-7-T-5 reads a single loss as "1 loss in a row"', () => {
		openOwn({ recentMatches: [...fiveMatches, { result: 'L', change: -15, ratingAfter: 669, teamSize: 1, playedAt: daysAgo(0) }] });
		expect(screen.getByTestId('form-streak').textContent).toBe('1 loss in a row');
	});

	it('US-7-T-5 reads a draw last as "Last match a draw"', () => {
		openOwn({ recentMatches: [...fiveMatches, { result: 'D', change: 0, ratingAfter: 684, teamSize: 1, playedAt: daysAgo(0) }] });
		expect(screen.getByTestId('form-streak').textContent).toBe('Last match a draw');
	});

	// +16 −15 +20 +25 +16 = +62.
	it('US-7-T-5 shows the net change of the matches', () => {
		openOwn();
		expect(screen.getByTestId('form-net').textContent).toBe('Net +62');
	});

	// The minus is U+2212, not a hyphen.
	it('US-7-T-5 writes a negative net with a real minus sign', () => {
		openOwn({ recentMatches: [{ result: 'L', change: -14, ratingAfter: 670, teamSize: 1, playedAt: daysAgo(0) }] });
		expect(screen.getByTestId('form-net').textContent).toBe('Net −14');
	});
});

describe('US-7-T-5 last 10 matches: the rating line', () => {
	const segments = (container: HTMLElement) => container.querySelectorAll('path.lb-pc-seg');

	it('US-7-T-5 draws one segment per match', () => {
		const { container } = openOwn();
		expect(segments(container)).toHaveLength(5);
	});

	// The second match is the loss.
	it('US-7-T-5 colours a loss\'s segment as a loss', () => {
		const { container } = openOwn();
		expect(segments(container)[1].classList.contains('L')).toBe(true);
	});

	it('US-7-T-5 colours a win\'s segment as a win', () => {
		const { container } = openOwn();
		expect(segments(container)[0].classList.contains('W')).toBe(true);
	});

	it('US-7-T-5 colours a draw\'s segment as a draw', () => {
		const { container } = openOwn({ recentMatches: [{ result: 'D', change: 0, ratingAfter: 684, teamSize: 1, playedAt: daysAgo(0) }] });
		expect(segments(container)[0].classList.contains('D')).toBe(true);
	});

	// Every path is a line segment: nothing fills the space under the line.
	it('US-7-T-5 draws no fill under the line', () => {
		openOwn();
		expect(within(section()).getByTestId('form-plot').querySelectorAll('path:not(.lb-pc-seg)')).toHaveLength(0);
	});

	it('US-7-T-5 labels the current rating at the right end of the line', () => {
		openOwn();
		expect(screen.getByTestId('form-now').textContent).toBe('684');
	});

	it('US-7-T-5 names the oldest end of the baseline "10 matches ago"', () => {
		openOwn();
		expect(within(section()).getByText('10 matches ago')).toBeTruthy();
	});

	it('US-7-T-5 names the newest end of the baseline "Now"', () => {
		openOwn();
		expect(within(section()).getByText('Now')).toBeTruthy();
	});

	// 622 to 684 has round values like 640 and 660 between.
	it('US-7-T-5 labels round rating values on the left', () => {
		openOwn();
		expect(screen.getAllByTestId('form-ylab').every((label) => Number(label.textContent) % 5 === 0)).toBe(true);
	});
});

describe('US-7-T-5 last 10 matches: reading a match', () => {
	const last = () => matches()[matches().length - 1];

	it('US-7-T-5 names each match for screen readers', () => {
		openOwn();
		expect(last().getAttribute('aria-label')).toBe('Win in 2v2, +16, 684 rating, today');
	});

	it('US-7-T-5 lets the keyboard reach each match', () => {
		openOwn();
		expect(matches().every((match) => match.tabIndex === 0)).toBe(true);
	});

	it('US-7-T-5 shows the tooltip "Win in 2v2 +16" when a match is focused', () => {
		openOwn();
		fireEvent.focus(last());
		expect(within(screen.getByRole('tooltip')).getByText('Win in 2v2 +16')).toBeTruthy();
	});

	it('US-7-T-5 gives the tooltip the rating and when, "684 rating, today"', () => {
		openOwn();
		fireEvent.focus(last());
		expect(within(screen.getByRole('tooltip')).getByText('684 rating, today')).toBeTruthy();
	});

	// The second match is the 3v3 loss, three days ago.
	it('US-7-T-5 shows the same tooltip on hover', () => {
		openOwn();
		fireEvent.pointerEnter(matches()[1]);
		expect(within(screen.getByRole('tooltip')).getByText('Loss in 3v3 −15')).toBeTruthy();
	});

	it('US-7-T-5 hides the tooltip when the pointer leaves the chart', () => {
		openOwn();
		fireEvent.pointerEnter(matches()[1]);
		fireEvent.pointerLeave(screen.getByTestId('form-plot'));
		expect(screen.queryByRole('tooltip')).toBeNull();
	});

	it('US-7-T-5 reads a match from yesterday as "yesterday"', () => {
		openOwn();
		expect(matches()[3].getAttribute('aria-label')).toBe('Win in 1v1, +25, 668 rating, yesterday');
	});

	it('US-7-T-5 reads a match three days ago as "3 days ago"', () => {
		openOwn();
		expect(matches()[1].getAttribute('aria-label')).toBe('Loss in 3v3, −15, 623 rating, 3 days ago');
	});
});

describe('US-7-T-5 last 10 matches: no matches yet', () => {
	it('US-7-T-5 says "No ranked matches yet" with no matches', () => {
		openOwn({ recentMatches: [] });
		expect(within(section()).getByText('No ranked matches yet')).toBeTruthy();
	});

	// An older AuthService sends no recentMatches at all.
	it('US-7-T-5 treats missing recentMatches as no matches', () => {
		openOwn({ recentMatches: undefined });
		expect(within(section()).getByText('No ranked matches yet')).toBeTruthy();
	});

	it('US-7-T-5 draws no chart with no matches', () => {
		openOwn({ recentMatches: [] });
		expect(within(section()).queryByTestId('form-plot')).toBeNull();
	});

	it('US-7-T-5 shows another player\'s last matches on their profile', async () => {
		mocks.user = goldUser;
		render(<OtherProfilePage />);
		await screen.findByRole('heading', { level: 1, name: 'Grace' });
		expect(matches()).toHaveLength(1);
	});
});

describe('US-7-T-5 demo panel (development only)', () => {
	// Opens your own profile as `npm run dev` would.
	function openDev(overrides: Partial<typeof goldUser> = {}) {
		vi.stubEnv('NODE_ENV', 'development');
		return openOwn(overrides);
	}
	const press = (name: 'Win' | 'Lose') => userEvent.click(screen.getByRole('button', { name }));

	// Vitest runs with NODE_ENV "test".
	it('US-7-T-5 shows no demo panel in tests', () => {
		openOwn();
		expect(demoPanel()).toBeNull();
	});

	it('US-7-T-5 shows no demo panel in production', () => {
		vi.stubEnv('NODE_ENV', 'production');
		openOwn();
		expect(demoPanel()).toBeNull();
	});

	it('US-7-T-5 shows the demo panel on your own profile in development', () => {
		openDev();
		expect(demoPanel()).toBeTruthy();
	});

	it('US-7-T-5 shows no demo panel on someone else\'s profile, even in development', async () => {
		vi.stubEnv('NODE_ENV', 'development');
		mocks.user = goldUser;
		render(<OtherProfilePage />);
		await screen.findByRole('heading', { level: 1, name: 'Grace' });
		expect(demoPanel()).toBeNull();
	});

	it('US-7-T-5 says the demo is local only', () => {
		openDev();
		expect(within(demoPanel() as HTMLElement).getByText('Local only, nothing is saved')).toBeTruthy();
	});

	// A win is worth a random 14 to 18.
	it('US-7-T-5 raises the shown rating on Win', async () => {
		openDev();
		await press('Win');
		expect(shownRating()).toBeGreaterThan(684);
	});

	it('US-7-T-5 calls no AuthService method on Win', async () => {
		openDev();
		await press('Win');
		const calls = [mocks.getUser, mocks.updateProfile, mocks.setPicture, mocks.removePicture].map((m) => m.mock.calls.length);
		expect(calls).toEqual([0, 0, 0, 0]);
	});

	it('US-7-T-5 lowers the shown rating on Lose', async () => {
		openDev();
		await press('Lose');
		expect(shownRating()).toBeLessThan(684);
	});

	// 24-17-3 is 44 matches; a win makes 45.
	it('US-7-T-5 counts the demo win as a played match', async () => {
		openDev();
		await press('Win');
		expect(within(screen.getByRole('group', { name: 'Wins' })).getByText('of 45 matches')).toBeTruthy();
	});

	it('US-7-T-5 adds the demo match to the chart', async () => {
		openDev();
		await press('Win');
		expect(matches()).toHaveLength(6);
	});

	it('US-7-T-5 keeps the chart at 10 matches, dropping the oldest', async () => {
		openDev({ recentMatches: tenMatches });
		await press('Win');
		expect(matches()).toHaveLength(10);
	});

	// 695 plus at least 14 crosses Gold II at 700.
	it('US-7-T-5 shows "Promoted Gold II" when a win crosses into Gold II', async () => {
		openDev({ rating: 695 });
		await press('Win');
		expect(screen.getByTestId('promotion-toast').textContent).toBe('Promoted Gold II');
	});

	it('US-7-T-5 peels the old league name off on a promotion', async () => {
		const { container } = openDev({ rating: 695 });
		await press('Win');
		expect(container.querySelector('.lb-pc-league-name .lb-pc-peel')).not.toBeNull();
	});

	// 602 minus at least 14 drops below Gold I's 600, into Silver III.
	it('US-7-T-5 shakes the league name into Silver III on a demotion', async () => {
		const { container } = openDev({ rating: 602 });
		await press('Lose');
		expect(container.querySelector('.lb-pc-league-name .lb-pc-shake')?.textContent).toBe('Silver III');
	});

	it('US-7-T-5 floats the rating change by the rating', async () => {
		const { container } = openDev();
		await press('Win');
		expect(container.querySelector('.lb-pc-delta')?.textContent).toMatch(/^\+1[4-8]$/);
	});

	// Gold II is the 8th of 13 leagues: 7 / 12.
	it('US-7-T-5 makes the card shine for the new league after a promotion', async () => {
		openDev({ rating: 695 });
		await press('Win');
		expect(screen.getByTestId('player-profile').style.getPropertyValue('--lb-pc-shine')).toBe('0.583');
	});
});

describe('US-7-T-5 demo league table (mirrors AuthService)', () => {
	it('US-7-T-5 puts a rating of 1 in Bronze I', () => {
		expect(demoLeagueFor(1).league).toBe('Bronze I');
	});

	it('US-7-T-5 starts Gold II at 700, with Gold III next at 800', () => {
		expect(demoLeagueFor(700)).toEqual({ league: 'Gold II', leagueMin: 700, nextLeague: { name: 'Gold III', at: 800 } });
	});

	it('US-7-T-5 has nothing above Platinum', () => {
		expect(demoLeagueFor(2500)).toEqual({ league: 'Platinum', leagueMin: 2000, nextLeague: null });
	});
});

describe('US-7-T-5 card depth (between the card and the page)', () => {
	const card = () => screen.getByRole('article', { name: 'Player card' });

	// The shadow is painted on the page just behind the card, not on the card.
	it('US-7-T-5 puts a cast shadow on the page right behind the card', () => {
		openOwn();
		expect(card().previousElementSibling?.classList.contains('lb-pc-cast')).toBe(true);
	});

	it('US-7-T-5 hides the cast shadow from screen readers', () => {
		openOwn();
		expect(card().previousElementSibling?.getAttribute('aria-hidden')).toBe('true');
	});
});
