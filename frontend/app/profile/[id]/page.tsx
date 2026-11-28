'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import RequireAuth from '../../login/protected';
import { useAuth } from '../../login/context';
import { AuthAPIService } from '../../login/controller';
import type { PublicProfile } from '../../login/controller';
import ProfileView, { ProfileScreen } from '../components/profile-view';

// The profile loaded for one id; `profile` is null when there is no such player.
interface Loaded {
	id: string;
	profile: PublicProfile | null;
}

// US-7-T-5: another player's profile, from GET /users/:id. The same layout as
// your own, read-only. Your own id goes to /profile, where you can edit.
function OtherProfile() {
	const { id } = useParams<{ id: string }>();
	const { user } = useAuth();
	const router = useRouter();
	const own = id === user?.id;
	const [loaded, setLoaded] = useState<Loaded | null>(null);

	useEffect(() => {
		if (own) {
			router.replace('/profile');
			return;
		}
		let live = true;
		new AuthAPIService().getUser(id)
			.catch(() => null)
			.then((profile) => {
				if (live) setLoaded({ id, profile });
			});
		return () => {
			live = false;
		};
	}, [id, own, router]);

	if (own || loaded?.id !== id) return null;
	if (!loaded.profile) {
		return (
			<main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
				<h1 className="text-[32px] font-black tracking-[-0.04em]">Player not found</h1>
				<Link href="/" className="text-sm text-muted hover:text-ink">Back to home</Link>
			</main>
		);
	}
	return <ProfileView profile={loaded.profile} />;
}

export default function OtherProfilePage() {
	return (
		<RequireAuth>
			<ProfileScreen>
				<OtherProfile />
			</ProfileScreen>
		</RequireAuth>
	);
}
