---
id: US-7-T-1
story: US-7
sprint: 4
assignee: asvinod (Ashwin Vinod)
estimate_hours: 6
---

# Rate players with Elo after each match and show it on a profile page

## Description
Serves US-7, More Fleshed-Out Matchmaking (#175). Every player gets an Elo-style rating and a league. When a match ends, each player's rating, wins, losses and draws are updated from the result. A new profile page shows the signed-in player their league, rating, record and join date.

The team chose Elo over Glicko because it is simple to explain and compute, needs only one number per player, and fits team matches by comparing each player with the opposing team's average.

Out of scope: matchmaking by rating (a team's average rating is defined here for later use), a list of problems the player has solved, a polished profile design (someone else will style the page), other players' profiles, and protecting against the same match being reported twice.

## Specs
- **Rating rules** (`service/AuthService/src/utils/rating.ts`)
  - Every player starts at **100**. A rating never goes below **1**.
  - A team's average is the mean of its players' ratings.
  - For each player, the expected score is `E = 1 / (1 + 10^((opponent team average − player rating) / 400))`.
  - The actual score `S` is **1** for a win, **0.5** for a draw and **0** for a loss.
  - The change is `ΔR = round(32 × (S − E))`, where `.5` rounds away from zero (+2.5 → +3, −2.5 → −3).
  - The new rating is `max(1, rating + ΔR)`.
  - Every change in a match is worked out from the ratings **before** that match. All players' changes are calculated first, then saved together, so one player's update never feeds into a teammate's or opponent's calculation.
  - Worked example (3v3): Team A is 50, 350 and 650 (average 350); Team B is 450, 450 and 450 (average 450). If Team A wins, the 50 goes to **79** (E ≈ 0.091, +29), the 350 to **370** (+20) and the 650 to **658** (+8).
- **Leagues** (`leagueFor(rating)` in the same file)

  | Rating | League |
  |---|---|
  | 1–99 | Bronze I |
  | 100–199 | Bronze II |
  | 200–299 | Bronze III |
  | 300–399 | Silver I |
  | 400–499 | Silver II |
  | 500–599 | Silver III |
  | 600–699 | Gold I |
  | 700–799 | Gold II |
  | 800–999 | Gold III |
  | 1000–1249 | Diamond I |
  | 1250–1499 | Diamond II |
  | 1500–1999 | Diamond III |
  | 2000+ | Platinum |

- **Match results**
  - A match with a winner (solved every problem, more points when time runs out, forfeit, or disconnect) is a win for every player on the winning team and a loss for every player on the other.
  - A match that ends on time with level scores (`winner: null`) is a draw for everyone.
  - A player who left mid-match still gets their team's result.
- **AuthService** (`service/AuthService`)
  - The `users` table has a `rating` column (default 100) and keeps a record with `games_played`, `games_won` and a new `games_lost`. Draws are `games_played − games_won − games_lost`.
  - `POST /internal/match-results` takes `{ "gameId": "<id>", "winner": "a" | "b" | null, "players": [{ "userId": "<uuid>", "team": "a" | "b" }] }`.
    - It requires `Authorization: Bearer <INTERNAL_API_KEY>`. A missing or wrong key returns 401, and nothing changes.
    - A malformed body returns 400, and nothing changes.
    - Otherwise it applies the rating rules and the win/loss/draw record to every listed player in one transaction. It returns 200 with each player's `{ userId, oldRating, newRating, change }`.
    - A listed user who doesn't exist in AuthService is skipped.
  - `GET /me` also returns `rating`, `league`, `wins`, `losses`, `draws` and the existing `createdAt` (join date).
- **GameService** (`service/GameService/src/server.ts`): when a match ends (`endGame`), it sends the match's roster and winner to AuthService's `POST /internal/match-results`, with `INTERNAL_API_KEY`, at `AUTH_SERVICE_URL`. If the call fails, the error is logged and the match still ends normally for the players.
- **Frontend**
  - A new page at `/profile` (`frontend/app/profile/page.tsx`) is for signed-in players only. It shows the player's name, league, rating, wins, losses, draws and join date, all from `GET /me`.
  - The user menu (`frontend/app/_home/components/user-menu.tsx`) has a "Profile" link to `/profile`.
  - The page follows the existing settings page's layout and theme tokens; no new visual design.

## Requirements
- A rating is only ever changed by `POST /internal/match-results`. Players can't set or change their own rating.
- `INTERNAL_API_KEY` is a new secret, a long random string, shared only by AuthService and GameService. It is never sent to the browser. It is separate from `SECRET` so the two can be changed independently. Locally it lives in the root `.env`, and tests set their own value.
- The schema change uses `ADD COLUMN IF NOT EXISTS`, so existing users get rating 100 and a 0–0–0 record.
- Before this is merged, whoever manages GCP adds the new columns to the deployed AuthService database and sets `INTERNAL_API_KEY` on AuthService and GameService, plus `AUTH_SERVICE_URL` on GameService. Otherwise `GET /me` would fail on the missing column.
- No new runtime dependencies.
- Frontend tests use mocked AuthService responses and never call a backend service.
- Existing AuthService, GameService and frontend tests keep passing.

## Acceptance criteria
1. A new player's rating is 100, and their league is Bronze II.
2. With Team A at 50, 350 and 650 and Team B at 450, 450 and 450, a Team A win changes Team A's ratings to 79, 370 and 658.
3. A win, a draw and a loss use S = 1, 0.5 and 0, and every change is calculated from the ratings before the match.
4. A rating never drops below 1.
5. Each rating range maps to its league from the table above, including the boundaries (99 is Bronze I, 100 is Bronze II, 2000 is Platinum).
6. When a match ends, every player's rating and win/loss/draw record are updated, including a player who left mid-match.
7. `POST /internal/match-results` without the correct internal key returns 401 and changes nothing.
8. The profile page shows the signed-in player's league, rating, wins, losses, draws and join date.
