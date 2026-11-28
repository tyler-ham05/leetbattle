// US-10-T-10: the match-start screen (app/ladder/match-start.tsx) and how the
// Ladder page hands over to it.
// Pseudocode: test/ladder-v2-test-pseudo.md, section "Match-start screen".
// The screen is tested on its own for the names; the page tests mock the queue
// socket context and use fake timers for the hand-over to /game/<gameId>.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { fakeUser } from './helpers';

const mocks = vi.hoisted(() => ({ useQueueSocket: vi.fn(), push: vi.fn() }));

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mocks.push, replace: vi.fn() }) }));
vi.mock('../app/login/context', () => ({ useAuth: () => ({ user: fakeUser, isLoading: false }) }));
vi.mock('../app/ladder/socket-context', async (importOriginal) => ({
	...(await importOriginal<typeof import('../app/ladder/socket-context')>()),
	useQueueSocket: () => mocks.useQueueSocket(),
}));

import LadderPage from '../app/ladder/page';
import MatchStart, { rowEm } from '../app/ladder/match-start';

const YOUR_TEAM = ['Ada', 'Linus'];
const RIVALS = ['Ken', 'Barbara'];

// The page with a match just found for game-1.
function renderMatched() {
	mocks.useQueueSocket.mockReturnValue({
		socket: { connected: true, emit: vi.fn() },
		connected: true,
		queue: { queue: null, counts: { '1v1': 0, '2v2': 0, '3v3': 0 } },
		matched: { gameId: 'game-1', yourTeam: YOUR_TEAM, rivals: RIVALS },
		error: null,
		connect: vi.fn(),
	});
	render(<LadderPage />);
}

const advance = (ms: number) => act(() => {
	vi.advanceTimersByTime(ms);
});
const row = (which: string) => document.querySelector(`[data-row="${which}"]`) as HTMLElement;
const names = (which: string) => Array.from(row(which).querySelectorAll('.lb-ms-main [data-name]'), (name) => name.textContent);

beforeEach(() => {
	vi.clearAllMocks();
	vi.useFakeTimers();
});

afterEach(() => {
	cleanup();
	vi.useRealTimers();
});

describe('US-10-T-10 Ladder hands over to the match-start screen', () => {
	it('US-10-T-10 shows MATCH FOUND once a match is found', () => {
		renderMatched();

		expect(screen.getByRole('status').textContent).toContain('MATCH FOUND');
	});

	it('US-10-T-10 shows the match-start screen shortly after the match is found', () => {
		renderMatched();
		// The button nods "MATCH FOUND" for 600 ms first.
		advance(600);

		expect(screen.getByTestId('match-start')).toBeTruthy();
	});

	it('US-10-T-10 stays on the Ladder while the match-start screen plays', () => {
		renderMatched();
		advance(3300);

		expect(mocks.push).not.toHaveBeenCalled();
	});

	it('US-10-T-10 opens the game when the match-start screen ends', () => {
		renderMatched();
		// 600 ms of MATCH FOUND, then 2.8 s of the screen.
		advance(3400);

		expect(mocks.push).toHaveBeenCalledWith('/game/game-1');
	});
});

describe('US-10-T-10 match-start screen', () => {
	it('US-10-T-10 shows each name on the player\'s team', () => {
		render(<MatchStart yourTeam={YOUR_TEAM} rivals={RIVALS} you="Ada" />);

		expect(names('mine')).toEqual(YOUR_TEAM);
	});

	it('US-10-T-10 shows each rival name', () => {
		render(<MatchStart yourTeam={YOUR_TEAM} rivals={RIVALS} you="Ada" />);

		expect(names('rivals')).toEqual(RIVALS);
	});

	it('US-10-T-10 tags the player\'s own name with YOU', () => {
		render(<MatchStart yourTeam={['Linus', 'Ada']} rivals={RIVALS} you="Ada" />);

		// Ada is second on her team here; the tag follows her name, not the first one.
		expect(row('mine').querySelector('.lb-ms-main [data-you]')?.previousElementSibling?.textContent).toBe('Ada');
	});

	it('US-10-T-10 separates names with a thin bar, not a dot', () => {
		render(<MatchStart yourTeam={YOUR_TEAM} rivals={RIVALS} you="Ada" />);

		// One bar between the two names in each row, and no middle dot anywhere.
		const bars = document.querySelectorAll('.lb-ms-main [data-sep="bar"]').length;
		expect({ bars, dot: document.body.textContent?.includes('·') }).toEqual({ bars: 2, dot: false });
	});

	it('US-10-T-10 reads YOUR TEAM and RIVALS when no names were sent', () => {
		render(<MatchStart you="Ada" />);

		expect([row('mine').querySelector('.lb-ms-main')?.textContent, row('rivals').querySelector('.lb-ms-main')?.textContent]).toEqual(['Your team', 'Rivals']);
	});

	it('US-10-T-10 sizes both rows so the longest one fits', () => {
		const long = ['ada_lovelace', 'xX_LinusT_Xx', 'grace.hopper.1906'];
		render(<MatchStart yourTeam={long} rivals={['Ken', 'Barbara', 'Dennis']} you="ada_lovelace" />);

		// The font size divides the screen width by the widest row, in em.
		expect(document.querySelector<HTMLElement>('[data-testid="match-start"]')?.style.getPropertyValue('--lb-ms-em')).toBe(String(rowEm(long)));
	});
});
