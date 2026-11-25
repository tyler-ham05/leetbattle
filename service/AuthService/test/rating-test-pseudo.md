# AuthService: player ratings, leagues, match results and the profile data (US-7-T-1)

## Rating maths (AC2, AC3, AC4)
- A player rated 50 against an opposing team averaging 450 should have an expected score of about 0.091
- In the worked example (Team A 50/350/650, Team B 450/450/450), a Team A win should change the 50 to 79
- In the worked example, a Team A win should change the 350 to 370
- In the worked example, a Team A win should change the 650 to 658
- A win should use S = 1: two equal players, the winner should gain 16
- A draw should use S = 0.5: two equal players, neither rating should change
- A loss should use S = 0: two equal players, the loser should lose 16
- A change of exactly +2.5 should round to +3 (half away from zero)
- A change of exactly -2.5 should round to -3 (half away from zero)
- A team's average should be the mean of its players' ratings
- A player rated 5 who loses 16 should end at 1, not below

## Leagues (AC1, AC5)
- A rating of 1 should be Bronze I
- A rating of 99 should be Bronze I
- A rating of 100 should be Bronze II
- A rating of 999 should be Gold III
- A rating of 1000 should be Diamond I
- A rating of 1999 should be Diamond III
- A rating of 2000 should be Platinum

## A new player (AC1)
- A player who just signed up should have a rating of 50 in GET /me
- A player who just signed up should be in the Bronze I league in GET /me
- A player who just signed up should have 0 wins, 0 losses and 0 draws in GET /me
- The signup response's user should already have a rating of 50
- After a player changes their name (PATCH /account), the response's user should still have their rating

## POST /internal/match-results (AC6, AC7)
- Without an Authorization header it should return 401
- With the wrong internal key it should return 401
- With the wrong internal key, no player's rating should change
- With a player's own login token (not the internal key) it should return 401
- A malformed body (no players) should return 400
- After a Team A win, a Team A player's rating in GET /me should go up
- After a Team A win, a Team B player's rating in GET /me should go down
- After a Team A win, a Team A player's wins in GET /me should be 1
- After a Team A win, a Team B player's losses in GET /me should be 1
- After a draw, a player's draws in GET /me should be 1
- Every change should use the ratings from before the match: in the worked example sent as one result, the 350 should end at 370 (not a value based on a teammate's new rating)
- A listed user who doesn't exist should be skipped, and the other players should still be updated
- The response should list each updated player's oldRating, newRating and change
