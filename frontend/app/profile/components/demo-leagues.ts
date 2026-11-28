import type { NextLeague } from '../../login/controller';

// DEV ONLY: used by the profile's demo panel (demo-panel.tsx), nowhere else.
// It mirrors AuthService's league table (service/AuthService/src/utils/rating.ts)
// so a pretend win or loss can show the league it would land in, without
// asking AuthService. Real profiles always take their league from AuthService.
// The lowest rating in each league, highest first.
const DEMO_LEAGUES: [number, string][] = [
	[2000, 'Platinum'],
	[1500, 'Diamond III'],
	[1250, 'Diamond II'],
	[1000, 'Diamond I'],
	[800, 'Gold III'],
	[700, 'Gold II'],
	[600, 'Gold I'],
	[500, 'Silver III'],
	[400, 'Silver II'],
	[300, 'Silver I'],
	[200, 'Bronze III'],
	[100, 'Bronze II'],
	[1, 'Bronze I'],
];

export interface DemoLeague {
	league: string;
	leagueMin: number;
	nextLeague: NextLeague | null;
}

// The league a rating is in, where it starts, and the league above (null in Platinum).
export function demoLeagueFor(rating: number): DemoLeague {
	const found = DEMO_LEAGUES.findIndex(([floor]) => rating >= floor);
	const index = found === -1 ? DEMO_LEAGUES.length - 1 : found;
	const [leagueMin, league] = DEMO_LEAGUES[index];
	const above = DEMO_LEAGUES[index - 1];
	return { league, leagueMin, nextLeague: above ? { name: above[1], at: above[0] } : null };
}
