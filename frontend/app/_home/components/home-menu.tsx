import Link from 'next/link';
import type { CSSProperties } from 'react';

export const MENU = [
	{ title: 'Practice', description: 'Three random problems in the editor', href: '/editor' },
	{ title: 'Lobby', description: 'Join a six-player lobby and pick a team', href: '/lobby' },
	{ title: 'Settings', description: 'Name, password and color theme', href: '/settings' },
];

// Compact list of the menu options under the wheel. Hovering or focusing an
// option selects it on the wheel.
export default function HomeMenu({ selected, onSelect }: { selected: number; onSelect: (_index: number) => void }) {
	return (
		<ul aria-label="Menu" className="m-0 grid list-none gap-3 p-0 [grid-template-columns:repeat(auto-fit,minmax(240px,1fr))]">
			{MENU.map((option, i) => (
				<li key={option.title} className="flex">
					<Link
						href={option.href}
						data-selected={i === selected}
						onMouseEnter={() => onSelect(i)}
						onFocus={() => onSelect(i)}
						className="lb-menu-row lb-rise-in flex flex-1 items-center gap-3.5 rounded-[14px] border border-line bg-surface px-[18px] py-4"
						style={{ '--d': `${0.1 + i * 0.08}s` } as CSSProperties}
					>
						<span className="font-mono text-xs font-semibold text-primary">{String(i + 1).padStart(2, '0')}</span>
						<span className="flex min-w-0 flex-1 flex-col gap-0.5">
							<span className="lb-menu-title text-xl font-extrabold leading-tight tracking-[-0.02em]">{option.title}</span>
							<span className="text-[13px] text-muted">{option.description}</span>
						</span>
						<svg className="lb-menu-arrow text-primary" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
							<path d="M5 12h14M13 6l6 6-6 6" />
						</svg>
					</Link>
				</li>
			))}
		</ul>
	);
}
