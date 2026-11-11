'use client';
import Link from 'next/link';
import Wordmark from '../../_shared/wordmark';
import UserMenu from './user-menu';

export default function HomeTopBar() {
	return (
		<header className="flex items-center justify-between gap-3 border-b border-line px-4 py-2 h-12">
			<Link
				href="/"
				aria-label="LeetBattle home"
				className="text-lg font-extrabold tracking-[-0.02em] decoration-primary decoration-2 underline-offset-4 lb-home-link focus-visible:underline"
			>
				<Wordmark />
			</Link>
			<UserMenu />
		</header>
	);
}
