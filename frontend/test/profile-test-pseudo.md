# Profile page: league, rating, record and join date (US-7-T-1)

(AuthService's GET /me is mocked; no test calls a backend service.)

## The profile page shows the signed-in player's stats (AC8)
- The profile page should show the player's name
- The profile page should show the player's league (e.g. "Silver II")
- The profile page should show the player's rating (e.g. "432")
- The profile page should show the player's number of wins
- The profile page should show the player's number of losses
- The profile page should show the player's number of draws
- The profile page should show the date the player joined
- Opening the profile page should reload the player's data from GET /me, so a rating changed by a match since the app loaded is shown

## Getting to the profile page
- The user menu should have a "Profile" link to /profile
- A signed-out visitor who opens /profile should be sent to /login
