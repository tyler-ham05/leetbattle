'use client';

import { useSyncExternalStore } from 'react';
import { DEFAULT_MODE, DEFAULT_SCHEME, SCHEMES, STORAGE_KEYS } from '../theme';
import Tooltip from './tooltip';

// Reads a data-* attribute on <html> and re-renders when it changes.
function subscribe(onChange: () => void) {
	const observer = new MutationObserver(onChange);
	observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-scheme', 'data-mode'] });
	return () => observer.disconnect();
}

function useHtmlAttribute(name: 'data-scheme' | 'data-mode', fallback: string) {
	return useSyncExternalStore(
		subscribe,
		() => document.documentElement.getAttribute(name) ?? fallback,
		() => fallback,
	);
}

// Colors swap in one frame: transitions are off (.theme-switching) while the
// new theme applies, then come back on once the browser has drawn it.
function save(name: 'scheme' | 'mode', value: string) {
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

export default function ThemeControls() {
	const scheme = useHtmlAttribute('data-scheme', DEFAULT_SCHEME);
	const mode = useHtmlAttribute('data-mode', DEFAULT_MODE);
	const isDark = mode === 'dark';

	return (
		<div className="flex items-center gap-3">
			<div className="flex items-center gap-2" role="group" aria-label="Color scheme">
				{SCHEMES.map((s) => (
					<Tooltip key={s.id} label={s.label}>
						<button
							type="button"
							className="lb-swatch size-5 rounded-full border border-line cursor-pointer [transition:scale_150ms_ease-out] hover:scale-110"
							style={{ background: s.swatch }}
							aria-label={`${s.label} color scheme`}
							aria-pressed={scheme === s.id}
							onClick={() => save('scheme', s.id)}
						/>
					</Tooltip>
				))}
			</div>
			<Tooltip label={isDark ? 'Light mode' : 'Dark mode'}>
				<button
					type="button"
					className="flex size-11 items-center justify-center rounded-xl border border-line text-ink cursor-pointer hover:bg-raised"
					aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
					onClick={() => save('mode', isDark ? 'light' : 'dark')}
				>
					{isDark ? (
						<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
							<circle cx="12" cy="12" r="4" />
							<path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
						</svg>
					) : (
						<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
							<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
						</svg>
					)}
				</button>
			</Tooltip>
		</div>
	);
}
