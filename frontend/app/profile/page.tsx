'use client';
import { useEffect } from 'react';
import RequireAuth from '../login/protected';
import { useAuth } from '../login/context';
import PageLoader from '../_shared/page-loader';
import HomeTopBar from '../_home/components/topbar';
import BackLink from '../_shared/back-link';

// The join date in words, e.g. "January 1, 2026". Read in UTC so it doesn't
// shift a day depending on the viewer's time zone.
function joinDate(createdAt: string): string {
	return new Date(createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
}

// US-7-T-1: the signed-in player's league, rating and record, from GET /me.
// A plain layout for now, following the settings page; it will be styled later.
function ProfileDetails() {
	const { user, refresh } = useAuth();

	// The signed-in user is loaded once when the app opens, so a match played
	// since then wouldn't show; reload GET /me whenever the page opens.
	useEffect(() => {
		void refresh();
	}, [refresh]);

	if (!user) return null;

	const stats: [string, string][] = [
		['League', user.league ?? 'Bronze I'],
		['Rating', String(user.rating ?? 50)],
		['Wins', String(user.wins ?? 0)],
		['Losses', String(user.losses ?? 0)],
		['Draws', String(user.draws ?? 0)],
		['Joined', joinDate(user.createdAt)],
	];

	return (
		<div className="flex w-full max-w-md flex-col gap-8">
			<div>
				<BackLink />
				<h1 className="mt-4 text-xl font-semibold">{user.name || user.email}</h1>
				<p className="text-sm text-muted">{user.email}</p>
			</div>
			<dl className="grid grid-cols-2 gap-x-6 gap-y-3 border-t border-line pt-8 text-sm">
				{stats.map(([label, value]) => (
					<div key={label} className="contents">
						<dt className="text-muted">{label}</dt>
						<dd className="font-medium">{value}</dd>
					</div>
				))}
			</dl>
		</div>
	);
}

export default function ProfilePage() {
	return (
		<RequireAuth>
			<div className="flex flex-1 flex-col bg-page font-sans">
				<PageLoader variant="pen" />
				<HomeTopBar />
				<main className="flex flex-1 items-start justify-center px-[clamp(24px,8vw,110px)] py-8 lg:py-12">
					<ProfileDetails />
				</main>
			</div>
		</RequireAuth>
	);
}
