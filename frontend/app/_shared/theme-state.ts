// The site's color scheme and light/dark mode live on <html> as data-scheme
// and data-mode (see globals.css). These read and change them; the settings
// theme picker and the top bar's light/dark button share them.
import { useSyncExternalStore } from 'react';
import { STORAGE_KEYS } from '../theme';

// Reads a data-* attribute on <html> and re-renders when it changes.
function subscribe(onChange: () => void) {
	const observer = new MutationObserver(onChange);
	observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-scheme', 'data-mode'] });
	return () => observer.disconnect();
}

export function useHtmlAttribute(name: 'data-scheme' | 'data-mode', fallback: string) {
	return useSyncExternalStore(
		subscribe,
		() => document.documentElement.getAttribute(name) ?? fallback,
		() => fallback,
	);
}

// Colors swap in one frame: transitions are off (.theme-switching) while the
// new theme applies, then come back on once the browser has drawn it.
export function saveTheme(name: 'scheme' | 'mode', value: string) {
	const root = document.documentElement;
	root.classList.add('theme-switching');
	root.setAttribute(`data-${name}`, value);
	void window.getComputedStyle(root).color; // apply the new colors now, with transitions off
	setTimeout(() => root.classList.remove('theme-switching'), 0);
	try {
		localStorage.setItem(STORAGE_KEYS[name], value);
	} catch {
		// storage can be blocked (private mode); the theme still applies for this visit
	}
}

