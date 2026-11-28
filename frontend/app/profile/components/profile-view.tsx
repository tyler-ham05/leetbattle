'use client';
import type { ReactNode } from 'react';
import PageLoader from '../../_shared/page-loader';
import HomeTopBar from '../../_home/components/topbar';
import type { PublicProfile } from '../../login/controller';
import { shownName } from './name';
import PlayerCard, { useProfileCount } from './player-card';
import type { CardEditor } from './player-card';
import DescriptionSlot from './description-editor';
import LeagueRow from './league-row';
import RecentMatches from './recent-matches';
import { leagueLook } from './league';

// Everything your own profile can change; absent on someone else's.
export interface ProfileEditor extends CardEditor {
	description: (_description: string) => Promise<boolean>;
}

// The page around a profile: the loader, the top bar, then the content.
export function ProfileScreen({ children }: { children: ReactNode }) {
	return (
		<div className="lb-pc-screen flex flex-1 flex-col bg-page font-sans">
			<PageLoader variant="pen" />
			<HomeTopBar />
			{children}
		</div>
	);
}

// "November 2026", read in UTC so it doesn't shift with the viewer's time zone.
function joinedMonth(createdAt: string): string {
	return new Date(createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', timeZone: 'UTC' });
}

// The name's letters drop in one by one; the heading's name is the whole name.
function Name({ name }: { name: string }) {
	return (
		<h1 aria-label={name} className="lb-pc-name">
			{name.split('').map((letter, i) => (
				<span key={i} aria-hidden="true" className="lb-pc-letter" style={{ animationDelay: `${(0.25 + i * 0.045).toFixed(3)}s` }}>{letter}</span>
			))}
		</h1>
	);
}

// One stat box. The detail line fades in on hover or focus, in space that is
// always reserved, so nothing moves.
function Stat({ label, value, suffix = '', detail }: { label: string; value: number; suffix?: string; detail: string }) {
	const shown = useProfileCount(value);
	return (
		<div role="group" aria-label={label} tabIndex={0} className="lb-pc-stat">
			<span className="lb-pc-cap">{label}</span>
			<span className="lb-pc-num">{shown}{suffix}</span>
			<span className="lb-pc-sub">{detail}</span>
		</div>
	);
}

// US-7-T-5: a player profile. The card fills the left 30%; the right 70% has
// when they joined, the name with the description beside it, the four stats,
// the league row and the last 10 matches. `edit` is only given on your own profile.
export default function ProfileView({ profile, edit }: { profile: PublicProfile; edit?: ProfileEditor }) {
	const wins = profile.wins ?? 0;
	const losses = profile.losses ?? 0;
	const draws = profile.draws ?? 0;
	const played = wins + losses + draws;
	const name = shownName(profile);
	return (
		<main data-testid="player-profile" className="lb-pc-wrap" style={leagueLook(profile.league ?? 'Bronze I')}>
			<div className="lb-pc-bg" aria-hidden="true"><div className="lb-pc-pool" /><div className="lb-pc-grain" /></div>
			<PlayerCard profile={profile} edit={edit} />
			<section className="lb-pc-side">
				<div className="lb-pc-who">
					<span className="lb-pc-cap">Joined {joinedMonth(profile.createdAt)}</span>
					<div className="lb-pc-name-row">
						<Name name={name} />
						<DescriptionSlot text={profile.description ?? ''} onSave={edit?.description} />
					</div>
					<div className="lb-pc-stats">
						<Stat label="Wins" value={wins} detail={`of ${played} matches`} />
						<Stat label="Losses" value={losses} detail={`of ${played} matches`} />
						<Stat label="Draws" value={draws} detail="scores level at time" />
						<Stat label="Win rate" value={played ? Math.round((wins / played) * 100) : 0} suffix="%" detail={`${wins} wins in ${played}`} />
					</div>
				</div>
				<LeagueRow profile={profile} />
				<RecentMatches matches={profile.recentMatches} />
			</section>
		</main>
	);
}
