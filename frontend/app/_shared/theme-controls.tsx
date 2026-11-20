'use client';

import { useState, useSyncExternalStore } from 'react';
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

// A small match screen drawn in one scheme. Any element with data-scheme and
// data-mode gets that scheme's --lb-* colors (see globals.css), so the preview
// can show a scheme without touching the page.
function SchemePreview({ id, mode, label, inUse }: { id: string; mode: string; label: string; inUse: boolean }) {
	return (
		<div
			key={id}
			data-testid="scheme-preview"
			data-scheme={id}
			data-mode={mode}
			className="lb-enter flex min-w-0 flex-col gap-4 rounded-lg border border-line bg-page p-5 text-ink"
		>
			<div className="flex items-baseline justify-between gap-2">
				<span aria-hidden="true" className="text-2xl font-black leading-none tracking-[-0.04em]">Leet<span className="text-primary">Battle</span></span>
				<span className="text-xs text-muted">{inUse ? 'In use' : `Previewing ${label}`}</span>
			</div>
			<div aria-hidden="true" className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
				<div className="flex flex-col gap-1.5">
					<span className="font-mono text-[10px] font-semibold tracking-[0.18em] text-primary">TEAM 1</span>
					<span className="text-[34px] font-black leading-none tracking-[-0.04em] text-primary">240</span>
					<span className="h-1.5 rounded-full bg-raised"><span className="block h-full w-[72%] rounded-full bg-primary" /></span>
				</div>
				<span className="font-mono text-xs font-bold tracking-[0.2em] text-muted">VS</span>
				<div className="flex flex-col items-end gap-1.5">
					<span className="font-mono text-[10px] font-semibold tracking-[0.18em] text-secondary">TEAM 2</span>
					<span className="text-[34px] font-black leading-none tracking-[-0.04em] text-secondary">180</span>
					<span className="flex h-1.5 w-full justify-end rounded-full bg-raised"><span className="block h-full w-[54%] rounded-full bg-secondary" /></span>
				</div>
			</div>
			<pre aria-hidden="true" className="m-0 overflow-x-auto rounded-md bg-raised px-3 py-2 font-mono text-xs leading-relaxed"><code>
				<span className="text-kw">def</span> twoSum(self, nums, target):{'\n'}
				{'    '}seen = {'{}'}  <span className="text-muted"># value -&gt; index</span>{'\n'}
				{'    '}<span className="text-kw">for</span> i, n <span className="text-kw">in</span> enumerate(nums):{'\n'}
				{'        '}<span className="text-kw">if</span> target - n <span className="text-kw">in</span> seen:{'\n'}
				{'            '}<span className="text-kw">return</span> [seen[target - n], i]{'\n'}
				{'        '}seen[n] = i  <span className="text-muted"># O(<span className="text-num">1</span>)</span>
			</code></pre>
			<div aria-hidden="true" className="flex flex-wrap items-center gap-2">
				<span className="inline-flex h-8 items-center rounded-lg bg-primary px-3 text-xs font-semibold text-on-primary">Submit</span>
				<span className="inline-flex h-8 items-center rounded-lg border border-line px-3 text-xs font-semibold">Run tests</span>
				<span className="ml-auto text-xs text-danger">Wrong answer</span>
			</div>
		</div>
	);
}

// "Try it on": the schemes as a list of names. Hovering or focusing one plays
// it in the preview; clicking one uses it for the whole site.
export default function ThemeControls() {
	const scheme = useHtmlAttribute('data-scheme', DEFAULT_SCHEME);
	const mode = useHtmlAttribute('data-mode', DEFAULT_MODE);
	const isDark = mode === 'dark';
	const [hovered, setHovered] = useState<string | null>(null);
	const shown = hovered ?? scheme;
	const shownLabel = SCHEMES.find((s) => s.id === shown)?.label ?? shown;

	return (
		<div className="flex flex-col gap-4">
			<div className="flex items-center justify-between gap-3">
				<p className="text-sm text-muted">Hover a theme to try it on</p>
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
			<div className="grid gap-5 sm:grid-cols-[160px_minmax(0,1fr)] sm:items-start">
				<div role="group" aria-label="Color scheme" className="flex flex-col gap-0.5" onPointerLeave={() => setHovered(null)}>
					{SCHEMES.map((s) => {
						const selected = scheme === s.id;
						return (
							<button
								key={s.id}
								type="button"
								aria-label={`${s.label} color scheme`}
								aria-pressed={selected}
								onPointerEnter={() => setHovered(s.id)}
								onFocus={() => setHovered(s.id)}
								onBlur={() => setHovered(null)}
								onClick={() => save('scheme', s.id)}
								className={`flex h-8 items-center gap-2.5 rounded-md px-2.5 text-left text-sm ${selected ? 'bg-raised font-medium text-ink' : 'text-muted hover:bg-raised hover:text-ink'}`}
							>
								{/* Both team colors of this scheme, split down the middle. */}
								<span
									aria-hidden="true"
									data-scheme={s.id}
									data-mode={mode}
									className="size-3.5 shrink-0 rounded-full border border-line bg-[linear-gradient(135deg,var(--lb-primary)_50%,var(--lb-secondary)_50%)]"
								/>
								{s.label}
							</button>
						);
					})}
				</div>
				<SchemePreview id={shown} mode={mode} label={shownLabel} inUse={shown === scheme} />
			</div>
		</div>
	);
}
