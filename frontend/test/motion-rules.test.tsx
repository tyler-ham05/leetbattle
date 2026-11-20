// Site-wide animation rules (UI only, no backend: auth and fetch are mocked).
// - entrances start at scale 0.97 + opacity 0, never from scale 0
// - pressed buttons scale to 0.97 with `transition: scale 150ms ease-out`
// - a wrong password shakes its field as well as turning it red
// - steppers slide the next step in from the direction you're going
// - accordions animate height: auto via `interpolate-size: allow-keywords`
// - moving things animate transform, never top or left
// - theme switches turn transitions off while the theme changes
// - tooltips: only the first one waits; once one is open the rest show at once
import fs from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fakeUser, jsonResponse, stubFetch } from './helpers';
import type { User } from '../app/login/controller';

vi.mock('next/navigation', () => ({
	useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
	useSearchParams: () => new URLSearchParams(''),
}));

// One shared auth object, so each test can choose signed in or signed out.
const auth: { user: User | null; isLoading: boolean; login: ReturnType<typeof vi.fn>; signup: ReturnType<typeof vi.fn>; logout: ReturnType<typeof vi.fn>; refresh: ReturnType<typeof vi.fn> } = {
	user: null,
	isLoading: false,
	login: vi.fn(),
	signup: vi.fn(),
	logout: vi.fn(),
	refresh: vi.fn(),
};
vi.mock('../app/login/context', () => ({ useAuth: () => auth }));

import LoginPage from '../app/login/page';
import SettingsPage from '../app/settings/page';
import UserMenu from '../app/_home/components/user-menu';
import ThemeControls from '../app/_shared/theme-controls';

const css = fs.readFileSync(path.resolve(__dirname, '../app/globals.css'), 'utf8');

// The body of the first CSS rule whose selector matches exactly.
function rule(selector: string) {
	const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	return css.match(new RegExp(`(^|[}\\s])${escaped}\\s*\\{([^}]*)\\}`, 'm'))?.[2] ?? '';
}

// Every @keyframes block in globals.css, as text.
function keyframeBlocks() {
	return css.match(/@keyframes[^{]*\{(?:[^{}]*\{[^}]*\})*[^}]*\}/g) ?? [];
}

beforeEach(() => {
	vi.unstubAllGlobals();
	auth.user = null;
	auth.login = vi.fn();
	localStorage.clear();
	localStorage.setItem('authToken', 'tok123');
});
afterEach(() => {
	cleanup();
	vi.useRealTimers();
	document.documentElement.removeAttribute('data-mode');
	document.documentElement.removeAttribute('data-scheme');
	document.documentElement.classList.remove('theme-switching');
});

describe('entrances', () => {
	// The shared entrance starts just under full size and invisible.
	it('starts the lb-enter keyframes at opacity 0 and scale 0.97', () => {
		expect(css).toMatch(/@keyframes lb-enter\s*\{\s*from\s*\{\s*opacity:\s*0;\s*transform:\s*scale\(0\.97\);?\s*\}/);
	});

	// The account menu enters with it instead of popping in.
	it('plays the entrance on the opened account menu', async () => {
		auth.user = fakeUser;
		render(<UserMenu />);
		await userEvent.click(screen.getByRole('button', { name: 'Account menu' }));
		expect(screen.getByRole('navigation', { name: 'Site' }).parentElement?.classList.contains('lb-enter')).toBe(true);
	});
});

describe('buttons', () => {
	// Pressing any enabled button shrinks it slightly.
	it('scales a pressed button to 0.97', () => {
		expect(rule('button:active:not(:disabled)')).toMatch(/scale:\s*0\.97/);
	});

	// The press animates the `scale` property over 150ms, easing out.
	it('transitions button scale over 150ms ease-out', () => {
		expect(rule('button')).toMatch(/transition:\s*scale 150ms ease-out/);
	});
});

describe('wrong passwords', () => {
	// The shake runs 0, -10, 10, -6, 6, -3, 0px.
	it('defines the shake as 0, -10, 10, -6, 6, -3, 0px', () => {
		const shake = keyframeBlocks().find((block) => block.startsWith('@keyframes lb-shake')) ?? '';
		expect([...shake.matchAll(/translateX\((-?\d+)px\)/g)].map((step) => step[1])).toEqual(['0', '-10', '10', '-6', '6', '-3', '0']);
	});

	// The shake lasts 360ms.
	it('runs the shake for 360ms', () => {
		expect(rule('.lb-shake')).toMatch(/360ms/);
	});

	// Logging in with a wrong password marks the Password field invalid (red).
	it('marks the log-in password field invalid after a failed log in', async () => {
		auth.login = vi.fn().mockRejectedValue(new Error('Invalid email or password'));
		render(<LoginPage />);
		await userEvent.type(screen.getByLabelText('Email'), 'ada@example.com');
		await userEvent.type(screen.getByLabelText('Password'), 'wrong');
		await userEvent.click(screen.getByRole('button', { name: 'Log in' }));
		await screen.findByText('Invalid email or password');
		expect(screen.getByLabelText('Password').getAttribute('aria-invalid')).toBe('true');
	});

	// ...and shakes it.
	it('shakes the log-in password field after a failed log in', async () => {
		auth.login = vi.fn().mockRejectedValue(new Error('Invalid email or password'));
		render(<LoginPage />);
		await userEvent.type(screen.getByLabelText('Email'), 'ada@example.com');
		await userEvent.type(screen.getByLabelText('Password'), 'wrong');
		await userEvent.click(screen.getByRole('button', { name: 'Log in' }));
		await screen.findByText('Invalid email or password');
		expect(screen.getByLabelText('Password').closest('.lb-shake')).not.toBeNull();
	});

	// Settings: a wrong current password shakes the "Current password" field.
	it('shakes the current password field when it is wrong in settings', async () => {
		auth.user = fakeUser;
		stubFetch(() => jsonResponse({ error: 'Current password is incorrect' }, 403));
		render(<SettingsPage />);
		await userEvent.type(screen.getByLabelText('Current password'), 'guess');
		await userEvent.type(screen.getByLabelText('New password'), 'new-password-1');
		await userEvent.click(screen.getByRole('button', { name: 'Change password' }));
		await screen.findByText('Current password is incorrect');
		expect(screen.getByLabelText('Current password').closest('.lb-shake')).not.toBeNull();
	});
});

describe('steppers', () => {
	// Log in -> Forgot password goes forward: the new step slides in from the right.
	it('slides "Reset your password" in from the right', async () => {
		render(<LoginPage />);
		await userEvent.click(screen.getByRole('button', { name: 'Forgot password?' }));
		expect(screen.getByRole('heading', { name: 'Reset your password' }).closest('[data-step]')?.getAttribute('data-step')).toBe('forward');
	});

	// Forgot password -> Back to log in goes back: it slides in from the left.
	it('slides "Log in" back in from the left', async () => {
		render(<LoginPage />);
		await userEvent.click(screen.getByRole('button', { name: 'Forgot password?' }));
		await userEvent.click(screen.getByRole('button', { name: 'Back to log in' }));
		expect(screen.getByRole('heading', { name: 'Log in' }).closest('[data-step]')?.getAttribute('data-step')).toBe('back');
	});
});

describe('accordions', () => {
	// height: auto can animate anywhere on the site.
	it('sets interpolate-size: allow-keywords on :root', () => {
		// :root has several rule blocks; any one of them may carry it.
		expect(css).toMatch(/(^|[}\s]):root\s*\{[^}]*interpolate-size:\s*allow-keywords/m);
	});

	// The Name field folds by animating its height, not a grid trick.
	it('folds the Name field with the lb-fold height transition', () => {
		render(<LoginPage />);
		expect(screen.getByLabelText('Name', { selector: 'input' }).closest('[data-collapsed]')?.classList.contains('lb-fold')).toBe(true);
	});
});

describe('moving things', () => {
	// No keyframe moves anything with top or left.
	it('never animates top or left in keyframes', () => {
		expect(keyframeBlocks().filter((block) => /[{;\s](top|left):/.test(block.replace(/^@keyframes[^{]*\{/, '')))).toEqual([]);
	});

	// The lobby's team-size highlight used to transition `left`.
	it('does not transition left in the lobby', () => {
		expect(fs.readFileSync(path.resolve(__dirname, '../app/lobby/page.tsx'), 'utf8')).not.toContain('transition-[left]');
	});
});

describe('theme switches', () => {
	// Nothing transitions while the theme changes.
	it('turns transitions off under .theme-switching', () => {
		expect(rule('.theme-switching *')).toMatch(/transition:\s*none\s*!important/);
	});

	// Picking a scheme puts the page in theme-switching mode...
	it('adds theme-switching to <html> when a scheme is picked', () => {
		vi.useFakeTimers();
		render(<ThemeControls />);
		fireEvent.click(screen.getByRole('button', { name: 'Volt color scheme' }));
		expect(document.documentElement.classList.contains('theme-switching')).toBe(true);
	});

	// ...and takes it out again once the new colors are in.
	it('removes theme-switching right after the switch', () => {
		vi.useFakeTimers();
		render(<ThemeControls />);
		fireEvent.click(screen.getByRole('button', { name: 'Volt color scheme' }));
		act(() => {
			vi.runAllTimers();
		});
		expect(document.documentElement.classList.contains('theme-switching')).toBe(false);
	});
});

describe('tooltips', () => {
	// The first tooltip waits before it opens.
	it('does not show the first tooltip straight away', () => {
		vi.useFakeTimers();
		render(<ThemeControls />);
		fireEvent.pointerEnter(screen.getByRole('button', { name: 'Volt color scheme' }));
		expect(screen.queryByRole('tooltip')).toBeNull();
	});

	// After the delay it shows the scheme's name.
	it('shows the first tooltip after the delay', () => {
		vi.useFakeTimers();
		render(<ThemeControls />);
		fireEvent.pointerEnter(screen.getByRole('button', { name: 'Volt color scheme' }));
		act(() => {
			vi.advanceTimersByTime(600);
		});
		expect(screen.getByRole('tooltip').textContent).toBe('Volt');
	});

	// Once one is open, moving to the next shows its tooltip at once.
	it('shows the next tooltip instantly while one is open', () => {
		vi.useFakeTimers();
		render(<ThemeControls />);
		const volt = screen.getByRole('button', { name: 'Volt color scheme' });
		fireEvent.pointerEnter(volt);
		act(() => {
			vi.advanceTimersByTime(600);
		});
		fireEvent.pointerLeave(volt);
		fireEvent.pointerEnter(screen.getByRole('button', { name: 'Midnight color scheme' }));
		expect(screen.getByRole('tooltip').textContent).toBe('Midnight');
	});
});
