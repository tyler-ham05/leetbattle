// US-4-T-6: the result screen's scores count up where the player can see them.
// The halves rise in from 1.55s and are fully in at 2.05s, so the count must
// still be going after that (before, it ran 1.5s to 2.2s and was ~99% done by
// the time the halves were visible). The crowns drop as the count lands.
// The digits are not tabular, so a narrow "1" doesn't leave a gap ("1 50").
//
// Pure rendering: no sockets, no backend.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import ResultScreen from '../app/game/components/result-screen';

// Team a (the viewer's) won 150 to 0, with one player so there is one crown.
function renderResult() {
	render(
		<ResultScreen
			result={{ winner: 'a', reason: 'solved' }}
			myTeam="a"
			scores={{ a: 150, b: 0 }}
			players={[{ userId: 'u1', displayName: 'Ada', team: 'a', connected: true, left: false }]}
			pool={[]}
			solved={{ a: [], b: [] }}
		/>,
	);
}

// The viewer's score as a number (the first final score shown).
const yourScore = () => Number(screen.getAllByTestId('final-score')[0].textContent);

// Moves the fake clock (timers, animation frames and performance.now) forward.
function after(ms: number) {
	act(() => {
		vi.advanceTimersByTime(ms);
	});
}

beforeEach(() => {
	vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame', 'cancelAnimationFrame', 'performance', 'Date'] });
});

afterEach(() => {
	cleanup();
	vi.useRealTimers();
});

describe('result screen score count', () => {
	// tabular-nums gives every digit the width of the widest, so "150" read as "1 50".
	it('does not pad the score digits to equal widths', () => {
		renderResult();
		expect(screen.getAllByTestId('final-score')[0].className).not.toContain('tabular-nums');
	});

	// Just after the halves are fully in (2.05s), the count is visibly under way.
	it('is still counting once the halves have risen in', () => {
		renderResult();
		after(2100);
		expect(yourScore()).toBeLessThan(75);
	});

	// By 3.2s the count has landed on the real score.
	it('lands on the final score once the count is done', () => {
		renderResult();
		after(3200);
		expect(yourScore()).toBe(150);
	});

	// The crown drops as the count lands (3s or later), not while it is still counting.
	it('drops the crown only once the count has landed', () => {
		renderResult();
		const crown = screen.getByRole('img', { name: 'Winner' }).parentElement as HTMLElement;
		expect(parseFloat(crown.style.getPropertyValue('--d'))).toBeGreaterThanOrEqual(2.9);
	});
});
