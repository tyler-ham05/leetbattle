'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../login/context';

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
		document.addEventListener('mousedown', onClickOutside);
		return () => document.removeEventListener('mousedown', onClickOutside);
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
				className="flex h-8 w-8 items-center justify-center rounded-full border border-line text-muted hover:bg-raised"
			>
				<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
					<circle cx="12" cy="8" r="4" />
					<path d="M4 20c0-4 3.5-6 8-6s8 2 8 6" />
				</svg>
			</button>

			{open && (
				<div className="absolute right-0 top-full z-10 mt-2 w-48 rounded-lg border border-line bg-surface py-1 shadow-lg">
					<div className="truncate px-3 py-2 text-sm font-medium text-ink">
						{user.name ?? user.email}
					</div>
					<div className="mx-auto my-1 w-[90%] border-t border-line" />
					<Link
						href="/settings"
						onClick={() => setOpen(false)}
						className="block px-3 py-2 text-sm text-ink hover:bg-raised"
					>
						Settings
					</Link>
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
