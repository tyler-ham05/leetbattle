// Favicon (UI only, no backend).
// - The icon is </> with a katana as the slash: < in Team 1's color, > in
//   Team 2's, on a square tile in the page color.
// - The katana's blade and guard are always white; its handle uses the muted color.
// - The tab icon follows the chosen scheme, always in that scheme's dark
//   colors (a white blade would vanish on a light tile).
// - Before any script runs, the static icon is the Emerald dark version.
import fs from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, waitFor } from '@testing-library/react';
import { faviconSvg } from '../app/_shared/favicon';
import ThemeFavicon from '../app/_shared/theme-favicon';

const colors = { page: '#000001', primary: '#000002', secondary: '#000003', muted: '#000004' };

// Stand-in theme colors, keyed by "scheme-mode", for the hidden probe element
// ThemeFavicon reads them from (jsdom doesn't apply globals.css).
const THEMES: Record<string, Record<string, string>> = {
	'emerald-dark': { '--lb-page': '#0b1210', '--lb-primary': '#34d399', '--lb-secondary': '#f2c14e', '--lb-muted': '#94a69e' },
	'vim-dark': { '--lb-page': '#000000', '--lb-primary': '#6fcb59', '--lb-secondary': '#5353f0', '--lb-muted': '#559b43' },
	'vim-light': { '--lb-page': '#ffffff', '--lb-primary': '#1f6b12', '--lb-secondary': '#2a2ad0', '--lb-muted': '#4a6a42' },
	'coffee-dark': { '--lb-page': '#1a1410', '--lb-primary': '#e6c9a3', '--lb-secondary': '#cf8462', '--lb-muted': '#ab9d90' },
};

// The current tab icon's href, decoded.
function iconHref() {
	return decodeURIComponent(document.querySelector('link[rel="icon"]')?.getAttribute('href') ?? '');
}

beforeEach(() => {
	vi.spyOn(window, 'getComputedStyle').mockImplementation((el: Element) => ({
		getPropertyValue: (name: string) => THEMES[`${el.getAttribute('data-scheme')}-${el.getAttribute('data-mode')}`]?.[name] ?? '',
	}) as CSSStyleDeclaration);
});
afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
	document.querySelectorAll('link[rel="icon"]').forEach((link) => link.remove());
	document.documentElement.removeAttribute('data-scheme');
	document.documentElement.removeAttribute('data-mode');
});

describe('favicon drawing', () => {
	it('draws the tile in the page color', () => {
		expect(faviconSvg(colors)).toContain('<rect width="32" height="32" fill="#000001"/>');
	});

	it('draws < in the Team 1 color', () => {
		expect(faviconSvg(colors)).toContain('<path d="M12.4 8.2L5.6 16l6.8 7.8" fill="none" stroke="#000002"');
	});

	it('draws > in the Team 2 color', () => {
		expect(faviconSvg(colors)).toContain('<path d="M19.6 8.2L26.4 16l-6.8 7.8" fill="none" stroke="#000003"');
	});

	// The blade is white whatever the theme.
	it('always draws the blade white', () => {
		expect(faviconSvg(colors)).toContain('fill="#ffffff" stroke="#000001"');
	});

	// The handle is not white: it uses the muted color so it reads as a grip.
	it('draws the handle in the muted color', () => {
		expect(faviconSvg(colors)).toContain('stroke="#000004" stroke-width="2.4"');
	});

	// The icon served before any script runs is the Emerald dark version.
	it('ships the Emerald dark icon as the static favicon', () => {
		const file = fs.readFileSync(path.resolve(__dirname, '../app/icon.svg'), 'utf8').trim();
		expect(file).toBe(faviconSvg({ page: '#0b1210', primary: '#34d399', secondary: '#f2c14e', muted: '#94a69e' }));
	});
});

describe('favicon follows the theme', () => {
	it('draws the tab icon in the chosen scheme\'s colors', () => {
		document.documentElement.setAttribute('data-scheme', 'vim');
		render(<ThemeFavicon />);
		expect(iconHref()).toContain('stroke="#5353f0"');
	});

	// In light mode the icon still uses the dark colors, so the white blade shows.
	it('uses the dark colors even in light mode', () => {
		document.documentElement.setAttribute('data-scheme', 'vim');
		document.documentElement.setAttribute('data-mode', 'light');
		render(<ThemeFavicon />);
		expect(iconHref()).toContain('fill="#000000"');
	});

	it('redraws the tab icon when the scheme changes', async () => {
		render(<ThemeFavicon />);
		act(() => {
			document.documentElement.setAttribute('data-scheme', 'coffee');
		});
		await waitFor(() => expect(iconHref()).toContain('stroke="#cf8462"'));
	});
});
