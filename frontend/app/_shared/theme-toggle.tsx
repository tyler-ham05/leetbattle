'use client';

import { DEFAULT_MODE } from '../theme';
import { saveTheme, useHtmlAttribute } from './theme-state';
import Tooltip from './tooltip';

// The light/dark button in the top bar of every page: a sun while dark
// (switches to light), a moon while light (switches to dark).
export default function ThemeToggle() {
	const isDark = useHtmlAttribute('data-mode', DEFAULT_MODE) === 'dark';

	return (
		<Tooltip label={isDark ? 'Light mode' : 'Dark mode'}>
			<button
				type="button"
				className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-muted hover:bg-raised hover:text-ink"
				aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
				onClick={() => saveTheme('mode', isDark ? 'light' : 'dark')}
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
	);
}
