'use client';
import Link from 'next/link';

export default function HomeNav() {
	return (
		<Link
			href="/login"
			className="inline-flex h-11 items-center rounded-xl bg-ink px-[18px] font-bold text-page hover:opacity-85"
		>
				Sign in
		</Link>
	);
}
