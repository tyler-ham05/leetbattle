'use client';
import type { ReactNode } from 'react';
import Link from 'next/link';
import Wordmark from '../../_shared/wordmark';
import UserMenu from './user-menu';
import ThemeToggle from '../../_shared/theme-toggle';

// The light/dark button sits just left of the account menu.
// `actions` sits left of those, e.g. the game page's Forfeit button.
// `center` sits in the true middle of the bar, e.g. the match score and clock.
export default function HomeTopBar({ actions, center }: { actions?: ReactNode; center?: ReactNode }) {
	return (
		<header className="grid h-12 grid-cols-[1fr_auto_1fr] items-center gap-3 border-b border-line px-4 py-2">
			<Link
				href="/"
				aria-label="LeetBattle home"
				className="justify-self-start text-lg font-extrabold tracking-[-0.02em] decoration-primary decoration-2 underline-offset-4 lb-home-link focus-visible:underline"
			>
				<Wordmark />
			</Link>
			<div>{center}</div>
			<div className="flex items-center justify-self-end gap-2">
				{actions}
				<ThemeToggle />
				<UserMenu />
			</div>
		</header>
	);
}
