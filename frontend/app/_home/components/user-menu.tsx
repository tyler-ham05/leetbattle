'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../login/context';

// Every page you can reach from the menu, in the order they are listed.
const PAGES = [
	{ href: '/', label: 'Home' },
	{ href: '/editor', label: 'Practice' },
	{ href: '/lobby', label: 'Lobby' },
	{ href: '/settings', label: 'Settings' },
];

export default function UserMenu() {
	const { user, logout } = useAuth();
	const router = useRouter();
	const [open, setOpen] = useState(false);
	const ref = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const onClickOutside = (e: MouseEvent) => {
			if (ref.current && !ref.current.contains(e.target as Node)) {
				setOpen(false);
			}
		};
		const onEscape = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				setOpen(false);
			}
		};
		document.addEventListener('mousedown', onClickOutside);
		document.addEventListener('keydown', onEscape);
		return () => {
			document.removeEventListener('mousedown', onClickOutside);
			document.removeEventListener('keydown', onEscape);
		};
	}, []);

	const onLogout = async () => {
		await logout();
		router.push('/');
	};

	if (!user) {
		return null;
	}

	return (
		<div ref={ref} className="relative">
			<button
				type="button"
				onClick={() => setOpen((v) => !v)}
				aria-label="Account menu"
				aria-expanded={open}
				className="flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-raised hover:text-ink"
			>
				<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
					<line x1="4" y1="7" x2="20" y2="7" />
					<line x1="4" y1="12" x2="20" y2="12" />
					<line x1="4" y1="17" x2="20" y2="17" />
				</svg>
			</button>

			{open && (
				<div className="absolute right-0 top-full z-10 mt-2 w-48 rounded-lg border border-line bg-surface py-1 shadow-lg">
					<div className="truncate px-3 py-2 text-sm font-medium text-ink">
						{user.name ?? user.email}
					</div>
					<div className="mx-auto my-1 w-[90%] border-t border-line" />
					<nav aria-label="Site">
						{PAGES.map((page) => (
							<Link
								key={page.href}
								href={page.href}
								onClick={() => setOpen(false)}
								className="block px-3 py-2 text-sm text-ink hover:bg-raised"
							>
								{page.label}
							</Link>
						))}
					</nav>
					<div className="mx-auto my-1 w-[90%] border-t border-line" />
					<button
						type="button"
						onClick={onLogout}
						className="block w-full px-3 py-2 text-left text-sm text-ink hover:bg-raised"
					>
						Log out
					</button>
				</div>
			)}
		</div>
	);
}
