'use client';
import Link from 'next/link';
import { useAuth } from './auth/context';

export default function HomeNav() {
	const { user, isLoading, logout } = useAuth();

	if (isLoading) {
		return null;
	}

	if (!user) {
		return (
			<nav className="flex gap-4">
				<Link href="/login">Log in</Link>
				<Link href="/signup">Sign up</Link>
			</nav>
		);
	}

	return (
		<nav className="flex gap-4">
			<Link href="editor">Editor</Link>
			<Link href="/settings">Settings</Link>
			<button onClick={() => logout()}>Log out</button>
		</nav>
	);
}
