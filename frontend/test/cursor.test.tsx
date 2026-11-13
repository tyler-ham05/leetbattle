// Background code snippets on the home screen should react to the cursor
//  - Moving the cursor onto a snippet should push it away from the cursor
//  - A pushed snippet should stay where it was pushed, not drift back
//  - A snippet far from the cursor should stay where it is
//  - Snippets should not react to the cursor when reduced motion is on
// The home menu should not show option numbers (01, 02, 03)
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { fakeUser } from './helpers';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }));
vi.mock('../app/login/context', () => ({ useAuth: () => ({ user: fakeUser, isLoading: false, logout: vi.fn() }) }));

import CodeRain from '../app/_home/components/code-rain';
import HomeActions from '../app/_home/components/home-actions';

// jsdom has no matchMedia. This stands in for the browser's media query API so a
// test can decide whether the user has "reduce motion" turned on.
function stubReducedMotion(reduce: boolean) {
	vi.stubGlobal('matchMedia', (query: string) => ({
		matches: reduce && query === '(prefers-reduced-motion: reduce)',
		media: query,
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
	}));
}

// jsdom does no layout, so every element reports a zero-size box at (0, 0).
// This places every snippet's box centred on the given point instead.
function placeSnippetsAt(x: number, y: number) {
	document.querySelectorAll<HTMLElement>('[data-kick]').forEach((el) => {
		el.getBoundingClientRect = () => ({ left: x - 20, top: y - 10, width: 40, height: 20, right: x + 20, bottom: y + 10, x: x - 20, y: y - 10, toJSON: () => ({}) });
	});
}

// The first snippet's sideways push in pixels, read from its transform (0 when untouched).
function firstSnippetPushX() {
	const transform = document.querySelector<HTMLElement>('[data-kick]')?.style.transform ?? '';
	const match = transform.match(/translate\((-?[\d.]+)px/);
	return match ? Number(match[1]) : 0;
}

beforeEach(() => {
	vi.unstubAllGlobals();
	stubReducedMotion(false);
});
afterEach(() => {
	cleanup();
});

describe('background snippets react to the cursor', () => {
	it('pushes a snippet away from the cursor', () => {
		render(<CodeRain />);
		placeSnippetsAt(200, 200);
		// The cursor arrives just left of the snippet, so it should be pushed to the right.
		fireEvent.mouseMove(window, { clientX: 150, clientY: 200 });
		fireEvent.mouseMove(window, { clientX: 185, clientY: 200 });
		expect(firstSnippetPushX()).toBeGreaterThan(0);
	});

	it('keeps a pushed snippet where it was pushed', () => {
		vi.useFakeTimers();
		render(<CodeRain />);
		placeSnippetsAt(200, 200);
		fireEvent.mouseMove(window, { clientX: 150, clientY: 200 });
		fireEvent.mouseMove(window, { clientX: 185, clientY: 200 });
		const rightAfterThePush = firstSnippetPushX();
		// Let a few seconds of animation frames play out.
		vi.advanceTimersByTime(3000);
		vi.useRealTimers();
		// It may slide a little further as it slows down, but never back toward its old spot.
		expect(firstSnippetPushX()).toBeGreaterThanOrEqual(rightAfterThePush);
	});

	it('leaves a snippet far from the cursor where it is', () => {
		render(<CodeRain />);
		placeSnippetsAt(1000, 1000);
		fireEvent.mouseMove(window, { clientX: 10, clientY: 10 });
		expect(firstSnippetPushX()).toBe(0);
	});

	it('does not react to the cursor when reduced motion is on', () => {
		stubReducedMotion(true);
		render(<CodeRain />);
		placeSnippetsAt(200, 200);
		fireEvent.mouseMove(window, { clientX: 185, clientY: 200 });
		expect(firstSnippetPushX()).toBe(0);
	});
});

describe('home menu without option numbers', () => {
	it('does not show option numbers', () => {
		render(<HomeActions />);
		expect(screen.getByRole('list', { name: 'Menu' }).textContent).not.toMatch(/0[1-3]/);
	});
});
