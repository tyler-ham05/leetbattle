// Color schemes (UI only, no backend).
// - Settings offers exactly these schemes, in this order: Emerald, Midnight,
//   Nocturne, Shoreline, Merlot, Coffee, Performative, Lilac, Tidepool,
//   Sugarplum, Vim. Volt and Ultraviolet are gone.
// - Every scheme has a dark and a light block of --lb-* colors in globals.css.
// - A saved scheme that no longer exists (e.g. "volt") falls back to the default.
// - "Try it on": the schemes are a list of names; hovering one shows it in a
//   live match preview without changing the page; leaving the list shows the
//   scheme in use again; clicking a name uses it.
import fs from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { SCHEMES, themeInitScript } from '../app/theme';
import ThemeControls from '../app/_shared/theme-controls';

const css = fs.readFileSync(path.resolve(__dirname, '../app/globals.css'), 'utf8');

const IDS = ['emerald', 'midnight', 'nocturne', 'shoreline', 'merlot', 'coffee', 'performative', 'lilac', 'tidepool', 'sugarplum', 'vim'];

// The live preview next to the list.
function preview() {
	return screen.getByTestId('scheme-preview');
}

beforeEach(() => {
	localStorage.clear();
});
afterEach(() => {
	cleanup();
	document.documentElement.removeAttribute('data-mode');
	document.documentElement.removeAttribute('data-scheme');
	document.documentElement.classList.remove('lb-intro-seen');
});

describe('available schemes', () => {
	// The list, in the order settings shows it.
	it('offers exactly the eleven schemes in order', () => {
		expect(SCHEMES.map((scheme) => scheme.id)).toEqual(IDS);
	});

	// Each scheme has its own dark colors...
	it.each(IDS)('defines dark colors for %s', (id) => {
		expect(css).toContain(`[data-scheme="${id}"][data-mode="dark"]`);
	});

	// ...and its own light colors.
	it.each(IDS)('defines light colors for %s', (id) => {
		expect(css).toContain(`[data-scheme="${id}"][data-mode="light"]`);
	});

	// The removed schemes leave no colors behind.
	it.each(['volt', 'ultraviolet'])('no longer defines %s', (id) => {
		expect(css).not.toContain(`[data-scheme="${id}"]`);
	});

	// Someone who saved Volt before gets the default scheme instead.
	it('ignores a saved scheme that no longer exists', () => {
		localStorage.setItem('lb-scheme', 'volt');
		new Function(themeInitScript)();
		expect(document.documentElement.getAttribute('data-scheme')).toBeNull();
	});
});

describe('try it on', () => {
	// Every scheme is listed by name.
	it.each(['Emerald', 'Midnight', 'Nocturne', 'Shoreline', 'Merlot', 'Coffee', 'Performative', 'Lilac', 'Tidepool', 'Sugarplum', 'Vim'])('lists %s', (name) => {
		render(<ThemeControls />);
		expect(screen.getByRole('button', { name: `${name} color scheme` }).textContent).toContain(name);
	});

	// With nothing hovered, the preview shows the scheme in use.
	it('previews the scheme in use by default', () => {
		render(<ThemeControls />);
		expect(preview().getAttribute('data-scheme')).toBe('emerald');
	});

	// Hovering a name plays that scheme in the preview...
	it('previews a scheme while it is hovered', () => {
		render(<ThemeControls />);
		fireEvent.pointerEnter(screen.getByRole('button', { name: 'Coffee color scheme' }));
		expect(preview().getAttribute('data-scheme')).toBe('coffee');
	});

	// ...and says it is only a preview.
	it('labels a hovered scheme as a preview', () => {
		render(<ThemeControls />);
		fireEvent.pointerEnter(screen.getByRole('button', { name: 'Coffee color scheme' }));
		expect(preview().textContent).toContain('Previewing Coffee');
	});

	// Hovering never changes the page itself.
	it('leaves the page scheme alone while hovering', () => {
		render(<ThemeControls />);
		fireEvent.pointerEnter(screen.getByRole('button', { name: 'Coffee color scheme' }));
		expect(document.documentElement.getAttribute('data-scheme')).toBeNull();
	});

	// Keyboard users get the same preview by focusing a name.
	it('previews a scheme when its name is focused', () => {
		render(<ThemeControls />);
		fireEvent.focus(screen.getByRole('button', { name: 'Lilac color scheme' }));
		expect(preview().getAttribute('data-scheme')).toBe('lilac');
	});

	// Leaving the list goes back to the scheme in use.
	it('shows the scheme in use again after leaving the list', () => {
		render(<ThemeControls />);
		fireEvent.pointerEnter(screen.getByRole('button', { name: 'Coffee color scheme' }));
		fireEvent.pointerLeave(screen.getByRole('group', { name: 'Color scheme' }));
		expect(preview().getAttribute('data-scheme')).toBe('emerald');
	});

	// Clicking a name uses it for the whole page.
	it('applies a scheme when it is clicked', () => {
		render(<ThemeControls />);
		fireEvent.click(screen.getByRole('button', { name: 'Vim color scheme' }));
		expect(document.documentElement.getAttribute('data-scheme')).toBe('vim');
	});

	// The preview follows light and dark mode too.
	it('previews in the current mode', () => {
		document.documentElement.setAttribute('data-mode', 'light');
		render(<ThemeControls />);
		expect(preview().getAttribute('data-mode')).toBe('light');
	});
});
