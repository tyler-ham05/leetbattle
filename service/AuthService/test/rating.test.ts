// US-7-T-1 Rating maths and leagues (pure functions in src/utils/rating.ts)
//
// Rating maths (AC2, AC3, AC4)
//  - A player rated 50 against an opposing team averaging 450 should have an expected score of about 0.091
//  - In the worked example (Team A 50/350/650, Team B 450/450/450), a Team A win should change the 50 to 79
//  - In the worked example, a Team A win should change the 350 to 370
//  - In the worked example, a Team A win should change the 650 to 658
//  - A win should use S = 1: two equal players, the winner should gain 16
//  - A draw should use S = 0.5: two equal players, neither rating should change
//  - A loss should use S = 0: two equal players, the loser should lose 16
//  - A change of exactly +2.5 should round to +3 (half away from zero)
//  - A change of exactly -2.5 should round to -3 (half away from zero)
//  - A team's average should be the mean of its players' ratings
//  - A player rated 5 who loses 16 should end at 1, not below
// Leagues (AC1, AC5)
//  - A rating of 1 should be Bronze I
//  - A rating of 99 should be Bronze I
//  - A rating of 100 should be Bronze II
//  - A rating of 999 should be Gold III
//  - A rating of 1000 should be Diamond I
//  - A rating of 1999 should be Diamond III
//  - A rating of 2000 should be Platinum
import { describe, expect, it } from 'vitest';
import { expectedScore, leagueFor, newRating, rateMatch, roundHalfAwayFromZero, teamAverage } from '../src/utils/rating';

// The worked example from the task file: Team A is 50/350/650 (average 350),
// Team B is three 450s (average 450), and Team A wins.
const workedExample = rateMatch([
	{ userId: 'a-50', team: 'a', rating: 50 },
	{ userId: 'a-350', team: 'a', rating: 350 },
	{ userId: 'a-650', team: 'a', rating: 650 },
	{ userId: 'b-1', team: 'b', rating: 450 },
	{ userId: 'b-2', team: 'b', rating: 450 },
	{ userId: 'b-3', team: 'b', rating: 450 },
], 'a');
const newRatingOf = (changes: { userId: string; newRating: number }[], userId: string) =>
	changes.find((change) => change.userId === userId)?.newRating;

// Two players rated 500 in a 1v1: each expects 0.5, so the outcome alone sets the change.
const evenMatch = (winner: 'a' | 'b' | null) => rateMatch([
	{ userId: 'a', team: 'a', rating: 500 },
	{ userId: 'b', team: 'b', rating: 500 },
], winner);

describe('US-7-T-1 rating maths', () => {
	it('US-7-T-1 gives a 50 against a 450 average an expected score of about 0.091', () => {
		expect(expectedScore(50, 450)).toBeCloseTo(1 / 11, 3);
	});

	it('US-7-T-1 moves the 50 to 79 when Team A wins the worked example', () => {
		expect(newRatingOf(workedExample, 'a-50')).toBe(79);
	});

	it('US-7-T-1 moves the 350 to 370 when Team A wins the worked example', () => {
		expect(newRatingOf(workedExample, 'a-350')).toBe(370);
	});

	it('US-7-T-1 moves the 650 to 658 when Team A wins the worked example', () => {
		expect(newRatingOf(workedExample, 'a-650')).toBe(658);
	});

	it('US-7-T-1 gives the winner of an even match +16 (S = 1)', () => {
		expect(newRatingOf(evenMatch('a'), 'a')).toBe(516);
	});

	it('US-7-T-1 leaves both ratings alone after an even draw (S = 0.5)', () => {
		expect(evenMatch(null).map((change) => change.newRating)).toEqual([500, 500]);
	});

	it('US-7-T-1 gives the loser of an even match -16 (S = 0)', () => {
		expect(newRatingOf(evenMatch('a'), 'b')).toBe(484);
	});

	it('US-7-T-1 rounds +2.5 up to +3', () => {
		expect(roundHalfAwayFromZero(2.5)).toBe(3);
	});

	it('US-7-T-1 rounds -2.5 down to -3', () => {
		expect(roundHalfAwayFromZero(-2.5)).toBe(-3);
	});

	it('US-7-T-1 averages a team\'s ratings', () => {
		expect(teamAverage([50, 350, 650])).toBe(350);
	});

	it('US-7-T-1 never lets a rating drop below 1', () => {
		expect(newRating(5, -16)).toBe(1);
	});
});

describe('US-7-T-1 leagues', () => {
	it.each([
		[1, 'Bronze I'],
		[99, 'Bronze I'],
		[100, 'Bronze II'],
		[999, 'Gold III'],
		[1000, 'Diamond I'],
		[1999, 'Diamond III'],
		[2000, 'Platinum'],
	])('US-7-T-1 puts a rating of %i in %s', (rating, league) => {
		expect(leagueFor(rating)).toBe(league);
	});
});
