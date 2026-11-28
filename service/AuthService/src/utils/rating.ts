// US-7-T-1: player ratings. Each player is compared with the opposing team's
// average rating, Elo-style, with a volatility (K) of 32.

export type TeamId = 'a' | 'b';

export const STARTING_RATING = 50;
const MIN_RATING = 1;
const K = 32;

// The lowest rating in each league, highest first.
const LEAGUES: [number, string][] = [
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
	[MIN_RATING, 'Bronze I'],
];

export function leagueFor(rating: number): string {
	return LEAGUES.find(([floor]) => rating >= floor)?.[1] ?? 'Bronze I';
}

// The chance the player is expected to win against a team with this average.
export function expectedScore(rating: number, opponentAverage: number): number {
	return 1 / (1 + 10 ** ((opponentAverage - rating) / 400));
}

export function teamAverage(ratings: number[]): number {
	return ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
}

// Math.round sends -2.5 to -2; here .5 always moves away from zero, so a win
// and a loss of the same size change ratings by the same amount.
export function roundHalfAwayFromZero(value: number): number {
	return Math.sign(value) * Math.round(Math.abs(value));
}

export function newRating(rating: number, change: number): number {
	return Math.max(MIN_RATING, rating + change);
}

export interface RatedPlayer {
	userId: string;
	team: TeamId;
	rating: number;
}

export interface RatingChange {
	userId: string;
	oldRating: number;
	newRating: number;
	change: number;
}

// The actual score: 1 for a win, 0.5 for a draw (no winner), 0 for a loss.
const scoreFor = (team: TeamId, winner: TeamId | null) => (winner === null ? 0.5 : team === winner ? 1 : 0);

// Every player's change in one match. All of them are worked out from the
// ratings before the match, so no player's new rating feeds into another's.
export function rateMatch(players: RatedPlayer[], winner: TeamId | null): RatingChange[] {
	const average = (team: TeamId) => teamAverage(players.filter((player) => player.team === team).map((player) => player.rating));
	const averages: Record<TeamId, number> = { a: average('a'), b: average('b') };
	return players.map(({ userId, team, rating }) => {
		const opponentAverage = averages[team === 'a' ? 'b' : 'a'];
		const delta = roundHalfAwayFromZero(K * (scoreFor(team, winner) - expectedScore(rating, opponentAverage)));
		const updated = newRating(rating, delta);
		return { userId, oldRating: rating, newRating: updated, change: updated - rating };
	});
}
