'use client';
import { useEffect, useMemo, useState } from 'react';
import RequireAuth from '../login/protected';
import { useAuth } from '../login/context';
import { AuthAPIService } from '../login/controller';
import type { User } from '../login/controller';
import ProfileView, { ProfileScreen } from './components/profile-view';
import type { ProfileEditor } from './components/profile-view';

// US-7-T-5: the signed-in player's own profile, from GET /me. Every change
// goes to AuthService with the player's own token, and the page then shows
// the account as AuthService answered it.
function OwnProfile() {
	const { user, refresh } = useAuth();
	const [saved, setSaved] = useState<User | null>(null);

	// The signed-in user is loaded once when the app opens, so a match played
	// since then wouldn't show; reload GET /me whenever the page opens.
	useEffect(() => {
		void refresh();
	}, [refresh]);

	const edit = useMemo<ProfileEditor>(() => {
		const api = new AuthAPIService();
		// Runs one change; true when AuthService saved it.
		const save = async (change: () => Promise<User>) => {
			try {
				setSaved(await change());
				return true;
			} catch {
				return false;
			}
		};
		return {
			icon: (icon) => save(() => api.updateProfile({ icon })),
			description: (description) => save(() => api.updateProfile({ description })),
			picture: (image) => save(() => api.setPicture(image)),
			removePicture: () => save(() => api.removePicture()),
		};
	}, []);

	const profile = saved ?? user;
	return profile ? <ProfileView profile={profile} edit={edit} /> : null;
}

export default function ProfilePage() {
	return (
		<RequireAuth>
			<ProfileScreen>
				<OwnProfile />
			</ProfileScreen>
		</RequireAuth>
	);
}
