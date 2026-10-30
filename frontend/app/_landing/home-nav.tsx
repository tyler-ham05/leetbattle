'use client';
import Link from 'next/link';
import { useAuth } from '../login/context';

export default function HomeNav() {
	const { user, isLoading } = useAuth();

	if (isLoading) {
		return null;
	}

	if (!user) {
		
	}

	return (
			<Link
				href="/login"
				className="inline-flex h-11 items-center rounded-xl bg-ink px-[18px] font-bold text-page hover:opacity-85"
			>
				Sign in
			</Link>
		);
}
