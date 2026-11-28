'use client';
import type { PublicProfile, RecentMatch } from '../../login/controller';
import { demoLeagueFor } from './demo-leagues';

// The fields a pretend match changes; laid over the real profile.
export type DemoChange = Pick<PublicProfile, 'rating' | 'league' | 'leagueMin' | 'nextLeague' | 'wins' | 'losses' | 'recentMatches'>;

// DEV ONLY: one pretend match on top of `profile`. A random 14 to 18 rating
// either way, one more win or loss, the match added to the last 10 (the
// oldest drops off), and the league worked out locally. Nothing is saved.
export function playDemo(profile: PublicProfile, won: boolean): DemoChange {
	const change = (won ? 1 : -1) * (14 + Math.floor(Math.random() * 5));
	const rating = Math.max(1, (profile.rating ?? 0) + change);
	const match: RecentMatch = {
		result: won ? 'W' : 'L',
		change: rating - (profile.rating ?? 0),
		ratingAfter: rating,
		teamSize: 1 + Math.floor(Math.random() * 3),
		playedAt: new Date().toISOString(),
	};
	return {
		...demoLeagueFor(rating),
		rating,
		wins: (profile.wins ?? 0) + (won ? 1 : 0),
		losses: (profile.losses ?? 0) + (won ? 0 : 1),
		recentMatches: [...(profile.recentMatches ?? []), match].slice(-10),
	};
}

// DEV ONLY: the demo controls, centred at the top of the screen. The own
// profile renders this only when NODE_ENV is "development".
export default function DemoPanel({ onPlay }: { onPlay: (_won: boolean) => void }) {
	return (
		<div role="group" aria-label="Demo" className="lb-pc-demo">
			<span>Demo</span>
			<button type="button" className="lb-pc-demo-win" onClick={() => onPlay(true)}>Win</button>
			<button type="button" className="lb-pc-demo-lose" onClick={() => onPlay(false)}>Lose</button>
			<span className="lb-pc-demo-note">Local only, nothing is saved</span>
		</div>
	);
}
