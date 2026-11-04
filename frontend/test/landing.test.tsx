// User clicks skip -> intro disappears immediately (without waiting for the
// 3300ms auto-dismiss timer to fire)
//
// Once the live demo's countdown finishes and it starts "playing":
//   - each solution line renders as syntax-highlighted token spans
//   - only the last line gets a blinking caret
//   - the resolved test-case tags (case 1/2/3, hidden 6/6) are shown
//
// ourScore/theirScore have 3 branches over the course of one cycle:
//   - not playing (still in the countdown): both scores 0
//   - playing, but not enough time has passed for either score: both 0
//   - playing, their score threshold passed but not ours yet: 0 / 100
//   - playing, both thresholds passed: 200 / 100
//
// Clicking Log out in HomeNav calls logout()
// HomeNav renders nothing while the auth state is still loading

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fakeUser } from './helpers';
import Intro from '../app/_landing/intro';
import LiveDemo from '../app/_landing/live-demo';

const logout = vi.fn();
// A mock we can redirect per-test (e.g. to simulate isLoading) instead of the
// fixed fakeUser/not-loading state every test used to get.
const useAuthMock = vi.fn();
vi.mock('../app/login/context', () => ({
	useAuth: () => useAuthMock(),
}));

import HomeNav from '../app/_shared/home-nav';

beforeEach(() => {
	vi.clearAllMocks();
	useAuthMock.mockReturnValue({ user: fakeUser, logout, isLoading: false });
});
afterEach(() => {
	cleanup();
	document.documentElement.classList.remove('lb-intro-seen');
	vi.useRealTimers();
});

describe('intro', () => {
	it('shows the Skip button initially', () => {
		vi.useFakeTimers();
		render(<Intro />);
		expect(screen.getByRole('button', { name: 'Skip' })).toBeTruthy();
	});

	it('unmounts immediately when Skip is clicked, without waiting for the auto-dismiss timer', () => {
		// Fake timers mean the only way the overlay can disappear during this
		// test is the Skip click itself, not the 3300ms timeout.
		vi.useFakeTimers();
		render(<Intro />);

		fireEvent.click(screen.getByRole('button', { name: 'Skip' }));

		expect(screen.queryByRole('button', { name: 'Skip' })).toBeNull();
	});
});

describe('live demo', () => {
	// tick starts at -3 (countdown); advancing 7s crosses the 4s
	// COUNTDOWN_SECONDS threshold, putting the component into "playing".
	function renderPlaying() {
		vi.useFakeTimers();
		const rendered = render(<LiveDemo />);
		act(() => {
			vi.advanceTimersByTime(7000);
		});
		return rendered;
	}

	it('renders a typed line for every solution line', () => {
		const { container } = renderPlaying();
		expect(container.querySelectorAll('.lb-type').length).toBeGreaterThan(0);
	});

	it('types the first line starting with the def keyword text', () => {
		const { container } = renderPlaying();
		const firstToken = container.querySelectorAll('.lb-type')[0].querySelectorAll('span')[0];
		expect(firstToken.textContent).toBe('def ');
	});

	it('colors the def keyword token distinctly from plain code', () => {
		const { container } = renderPlaying();
		const firstToken = container.querySelectorAll('.lb-type')[0].querySelectorAll('span')[0];
		expect(firstToken.className).toContain('text-kw');
	});

	it('gives only the last line a blinking caret', () => {
		const { container } = renderPlaying();
		expect(container.querySelectorAll('.lb-caret').length).toBe(1);
	});

	it('shows the resolved test-case tags', () => {
		const { container } = renderPlaying();
		const tags = Array.from(container.querySelectorAll('.lb-tick')).map((el) => el.textContent);
		expect(tags).toEqual(['case 1', 'case 2', 'case 3', 'hidden 6/6']);
	});
});

describe('live demo scoring', () => {
	// tick starts at -3; phase === tick for the whole first cycle (tick < 18),
	// so a target tick reaches that exact phase/played value deterministically.
	// TYPING_DONE for this solution is ~6.36s, so ourScore's threshold
	// (Math.ceil(TYPING_DONE + 1.6)) is 8.
	function renderAtTick(tick: number) {
		vi.useFakeTimers();
		const rendered = render(<LiveDemo />);
		act(() => {
			vi.advanceTimersByTime((tick + 3) * 1000);
		});
		return rendered;
	}

	function scoreFor(container: HTMLElement, label: string) {
		return within(container).getByText(label).closest('div')?.querySelector('.lb-pop')?.textContent;
	}

	it('keeps our score at 0 before the match starts playing', () => {
		const { container } = renderAtTick(-3);
		expect(scoreFor(container, 'Your team')).toBe('0');
	});

	it('keeps their score at 0 before the match starts playing', () => {
		const { container } = renderAtTick(-3);
		expect(scoreFor(container, 'Opponents')).toBe('0');
	});

	it('keeps our score at 0 right after playing starts (played < 3)', () => {
		const { container } = renderAtTick(4);
		expect(scoreFor(container, 'Your team')).toBe('0');
	});

	it('keeps their score at 0 right after playing starts (played < 3)', () => {
		const { container } = renderAtTick(4);
		expect(scoreFor(container, 'Opponents')).toBe('0');
	});

	it('keeps our score at 0 once their score threshold has passed but not ours (3 <= played < 8)', () => {
		const { container } = renderAtTick(7);
		expect(scoreFor(container, 'Your team')).toBe('0');
	});

	it('awards their score once played >= 3', () => {
		const { container } = renderAtTick(7);
		expect(scoreFor(container, 'Opponents')).toBe('100');
	});

	it('awards our score once played >= 8', () => {
		const { container } = renderAtTick(12);
		expect(scoreFor(container, 'Your team')).toBe('200');
	});

	it('keeps their score awarded once played >= 8', () => {
		const { container } = renderAtTick(12);
		expect(scoreFor(container, 'Opponents')).toBe('100');
	});
});

describe('live demo countdown', () => {
	// tick starts at -3, so phase === tick once tick >= 0; for 0 <= phase <= 2
	// the Countdown shows "3 - phase" (i.e. 3, 2, 1) before play begins.
	function renderAtTick(tick: number) {
		vi.useFakeTimers();
		const rendered = render(<LiveDemo />);
		act(() => {
			vi.advanceTimersByTime((tick + 3) * 1000);
		});
		return rendered;
	}

	it('shows the countdown number while phase is between 0 and 2', () => {
		const { container } = renderAtTick(1);
		expect(container.querySelector('.lb-count')?.textContent).toBe('2');
	});

	it('shows the LeetBattle reveal at phase 3', () => {
		const { container } = renderAtTick(3);
		expect(container.querySelector('.lb-wipe')?.textContent).toBe('LeetBattle!');
	});
});

describe('home nav', () => {
	it('logs out when the Log out button is clicked', async () => {
		render(<HomeNav />);
		await userEvent.click(screen.getByRole('button', { name: 'Log out' }));
		expect(logout).toHaveBeenCalledTimes(1);
	});

	it('renders nothing while the auth state is still loading', () => {
		useAuthMock.mockReturnValue({ user: null, logout, isLoading: true });
		const { container } = render(<HomeNav />);
		expect(container.firstChild).toBeNull();
	});
});
