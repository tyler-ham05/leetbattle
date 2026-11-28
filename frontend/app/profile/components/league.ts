import type { CSSProperties } from 'react';
import type { NextLeague } from '../../login/controller';

// The 13 league names, lowest first, only to place a league on the shine
// scale. The ratings that bound them come from AuthService (leagueMin and
// nextLeague), so the table itself isn't copied here.
const LEAGUE_NAMES = [
	'Bronze I', 'Bronze II', 'Bronze III',
	'Silver I', 'Silver II', 'Silver III',
	'Gold I', 'Gold II', 'Gold III',
	'Diamond I', 'Diamond II', 'Diamond III',
	'Platinum',
];
const METALS = ['bronze', 'silver', 'gold', 'diamond', 'platinum'];

// The card's metal colour and how much it shines: Bronze I is nearly matte
// (0) and Platinum is full foil (1). Set as CSS variables on the page.
export function leagueLook(league: string): CSSProperties {
	const metal = league.split(' ')[0].toLowerCase();
	const place = Math.max(0, LEAGUE_NAMES.indexOf(league));
	return {
		'--lb-pc-metal': `var(--lb-metal-${METALS.includes(metal) ? metal : 'bronze'})`,
		'--lb-pc-shine': (place / (LEAGUE_NAMES.length - 1)).toFixed(3),
	} as CSSProperties;
}

// How far the rating is from the league's lowest rating to the next league,
// 0 to 100. With no next league (Platinum) the bar is full.
export function leagueProgress(rating: number, leagueMin: number, next: NextLeague | null): number {
	if (!next) return 100;
	const span = Math.max(1, next.at - leagueMin);
	return Math.min(100, Math.max(0, ((rating - leagueMin) / span) * 100));
}
