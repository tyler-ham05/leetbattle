'use client';
import Link from 'next/link';
import Wordmark from '../../_shared/wordmark';
import UserMenu from './user-menu';

export default function HomeTopBar() {
	return (
		<div className="flex items-center justify-between gap-3 border-b border-line px-4 py-2 h-12">
			<Link href="/" className="text-lg font-extrabold tracking-[-0.02em]">
				<Wordmark />
			</Link>
			<UserMenu />
		</div>
	);
}
