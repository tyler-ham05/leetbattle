'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../auth/context';

export default function TopBar() {
	const { user, logout } = useAuth();
	const router = useRouter();

	const onLogout = async () => {
		await logout();
		router.push('/login');
	};

	return (
		<div className="flex items-center justify-end gap-3 border-b border-zinc-200 px-4 py-2 dark:border-zinc-800 h-12">
			{user && (
				<>
					<span className="text-sm text-zinc-500">{user.email}</span>
					<Link href="/settings" className="text-sm underline">
						Settings
					</Link>
					<button onClick={onLogout} className="text-sm underline">
						Log out
					</button>
				</>
			)}
		</div>
	);
}
