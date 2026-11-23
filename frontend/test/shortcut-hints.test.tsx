// US-5-T-23: Run and Submit tell the player their keyboard shortcuts. Hovering
// either button opens the app's usual tooltip (app/_shared/tooltip.tsx) with
// the shortcut, written for the player's computer: ⌘ on a Mac, Ctrl elsewhere.
//
// The editor context is mocked, so SubmitBar renders on its own and nothing
// here reaches CodeService or any other backend.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';

// A SubmitBar with nothing running: both buttons enabled, no workspace owner.
vi.mock('../app/editor/context', () => ({
	useEditor: () => ({
		onRun: vi.fn(),
		onSubmit: vi.fn(),
		loadingAction: null,
		isLoading: false,
		readOnly: false,
	}),
}));

import SubmitBar from '../app/editor/components/submit-bar';

const MAC = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36';
const WINDOWS = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

// Renders the bar as if on a computer with this user agent.
function renderOn(userAgent: string) {
	vi.spyOn(window.navigator, 'userAgent', 'get').mockReturnValue(userAgent);
	render(<SubmitBar />);
}

// Hovers a button's tooltip wrapper and waits out the tooltip delay, then
// returns whatever tooltip text is showing.
function hoverTooltip(buttonName: string) {
	const button = screen.getByRole('button', { name: buttonName });
	fireEvent.pointerEnter(button.parentElement as HTMLElement);
	act(() => {
		vi.advanceTimersByTime(600);
	});
	return screen.queryByRole('tooltip')?.textContent;
}

beforeEach(() => {
	vi.useFakeTimers();
});

afterEach(() => {
	cleanup();
	vi.useRealTimers();
	vi.restoreAllMocks();
});

describe('shortcut hints on Run and Submit', () => {
	// A Mac player is shown the Command key for running.
	it('shows ⌘ Enter when hovering Run on a Mac', () => {
		renderOn(MAC);
		expect(hoverTooltip('Run')).toBe('⌘ Enter');
	});

	// A Mac player is shown Command + Shift for submitting.
	it('shows ⌘ Shift Enter when hovering Submit on a Mac', () => {
		renderOn(MAC);
		expect(hoverTooltip('Submit')).toBe('⌘ Shift Enter');
	});

	// Everyone else is shown Ctrl for running.
	it('shows Ctrl Enter when hovering Run on Windows', () => {
		renderOn(WINDOWS);
		expect(hoverTooltip('Run')).toBe('Ctrl Enter');
	});

	// Everyone else is shown Ctrl + Shift for submitting.
	it('shows Ctrl Shift Enter when hovering Submit on Windows', () => {
		renderOn(WINDOWS);
		expect(hoverTooltip('Submit')).toBe('Ctrl Shift Enter');
	});

	// The tooltip doesn't rename the button: screen readers still hear "Run".
	it('keeps the Run button named Run', () => {
		renderOn(MAC);
		expect(screen.getByRole('button', { name: 'Run' })).toBeTruthy();
	});
});
