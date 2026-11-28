---
id: US-7-T-5
story: US-7
sprint: 4
assignee: woozoo21 (Sashreek Rewatkar)
estimate_hours: 4
---

# Player profiles: a player card with an icon, a description, the league and the record

## Description
Serves US-7, More Fleshed-Out Matchmaking (#175), issue #182. The plain `/profile` page from US-7-T-1 becomes a player profile built around a **player card**: a trading-card-style panel that tilts toward the pointer and shines more the higher the player's league. Beside it: the player's name, a one-line description, their record, and their league with a progress bar to the next one. Players choose their own icon and write their own description; nobody else can. Anyone signed in can open another player's profile from the lobby or the match result screen.

The approved design is the player-card mock-up: https://claude.ai/artifact/McteyJApVUK5zThUHRjTpo. Its "Demo" panel (Win, Lose and the last-10 switcher) is for trying the motion only and is not part of the page.

Out of scope: the "Last 10 matches" rating line from the mock-up (it needs a match history, which AuthService doesn't keep; it becomes its own task), achievements, uploaded pictures, and showing a player's email to anyone else.

## Specs

### Data (`service/AuthService/sql/schema.sql`)
- `users` gains `icon TEXT NOT NULL DEFAULT 'katana'` and `description TEXT NOT NULL DEFAULT ''`, both added with `ADD COLUMN IF NOT EXISTS`.

### Icons
- A player picks one of 8 preset icons. The keys are `katana`, `brackets`, `terminal`, `bolt`, `flame`, `crown`, `cube`, `moon`.
- AuthService keeps the list of allowed keys (`service/AuthService/src/utils/profile.ts`, `ICONS`). The frontend draws them (`frontend/app/_shared/profile-icons.tsx`) from the same keys.

### Leagues for the profile
- AuthService already has the league table (`leagueFor` in `src/utils/rating.ts`, from US-7-T-1). Next to `league`, it now also returns:
  - `leagueMin`: the lowest rating in the player's league (e.g. 600 for Gold I);
  - `nextLeague`: `{ "name": "Gold II", "at": 700 }`, or `null` in Platinum.
- The frontend doesn't copy the league table.

### AuthService API
- `GET /me` also returns `icon`, `description`, `leagueMin` and `nextLeague`.
- `PATCH /account` (signed in) also accepts `icon` and `description`. Each is optional, and a body with none of `name`, `icon` and `description` returns 400.
  - `icon` must be one of the 8 keys, else 400.
  - `description` is trimmed and must be at most 80 characters after trimming, else 400. An empty string clears it.
  - The account changed is always the signed-in one, from the token. There is no user id in the body, so nobody can change another player's profile.
- New `GET /users/:id` (signed in) returns one player's public profile: `{ id, name, icon, description, rating, league, leagueMin, nextLeague, wins, losses, draws, createdAt }`.
  - It never includes `email` or `emailVerified`.
  - An id that isn't a UUID, or a user that doesn't exist, returns 404.

### Frontend: the profile page
- `/profile` shows the signed-in player's own profile from `GET /me`. It can be edited.
- `/profile/[id]` shows another player's profile from `GET /users/:id`. It's read-only, with no edit controls. Opening your own id redirects to `/profile`.
- **Layout:** the card on the left, the details on the right, one screen tall on a laptop. Below 860px wide, the card sits above the details.
- **The card:**
  - "LeetBattle" and "RANKED" across the top.
  - The icon in a square window. Clicking your own icon opens a picker with the 8 icons; choosing one saves it (`PATCH /account`), and the new icon spins in.
  - The name, the league in its metal colour, the rating, and Wins, Losses and Draws.
- **Details:**
  - "JOINED <MONTH YEAR>".
  - The name, in the heaviest weight with tight spacing.
  - The description.
  - Four stats: Wins, Losses, Draws, Win rate. Hovering or focusing a stat shows one detail line, for example "of 44 matches".
  - The name, the description and the stats are evenly spaced.
- **Description editing (own profile only):**
  - A pencil next to it, or "Add a short description" when it's empty, opens an inline field with a live "n / 80" count.
  - Enter or Save saves, and Esc or Cancel cancels.
  - It is always shown as plain text, never as HTML.
- **League row:**
  - The league name in its metal colour and the rating.
  - A bar from `leagueMin` to `nextLeague.at`.
  - The two ends labelled with league and number, e.g. "Gold I 600" and "Gold II 700".
  - In Platinum the bar is full and the right end reads "Top league".
- **Metal colours:** fixed hues like the difficulty colours, one each for Bronze, Silver, Gold, Diamond and Platinum, with a dark and a light shade so they read in both modes.
- **Background:**
  - The league family (GOLD, DIAMOND…) in very large, very faint type in the lower right. It's sized so DIAMOND fills about 65% of the width, and every league uses that size; only PLATINUM shrinks, if it would come near the left edge.
  - A soft pool of the metal colour behind the card.
  - Fine film grain.
  - Nothing runs to the edge of the screen.

### Frontend: opening a profile
- In the lobby (`frontend/app/lobby/page.tsx`) and on the result screen (`frontend/app/game/components/result-screen.tsx`), every player's name links to `/profile/<userId>`.
- The user menu keeps its "Profile" link to `/profile`.

### Motion (`app/globals.css` MOTION section, `docs/frontend/animation.md`)
- **The card enters** by swinging up. While the pointer is over it, it tilts toward the pointer, and a foil, a glitter and an edge light follow the pointer.
- **Shine grows with the league:** Bronze I is nearly matte and Platinum is full foil. There is no white sweep and no glow.
- **The rating is an odometer:** each digit rolls to its number. Each digit's slot is as wide as that digit, so numbers never look unevenly spaced.
- **Other numbers** count up when the page opens.
- **The league bar** grows from the left, with a slow shine moving along it.
- **The name's letters** drop in one by one.
- **Moving the pointer** shifts the background word a few pixels and the light pool behind the card.
- **Reduced motion:** no tilt, no shine movement, no rolling or counting. Everything shows in its final state.

### Type and theme
- Text and numbers use the app's Onest font, with natural digit spacing.
- Only the theme classes in `docs/frontend/theming.md` are used, plus the five metal colours, which are added as `--lb-*` variables for both modes.
- No icons next to stats or labels, no dots or dotted lines, and no "·" between words.
- Corners are small (about 4–12px).

## Requirements
- Only the signed-in player can change their icon and description, through `PATCH /account` with their own token.
- Descriptions are limited to 80 characters on the server and are always rendered as text. No `dangerouslySetInnerHTML` or similar.
- `GET /users/:id` never sends an email address.
- No new runtime dependencies. The card effects are CSS, and the pointer tracking is a small amount of plain code.
- Before this is merged, whoever manages GCP adds the `icon` and `description` columns to the deployed AuthService database. Otherwise `GET /me` fails on the missing columns.
- New AuthService tests go in `service/AuthService/test/`. Frontend tests go in `frontend/test/` and mock AuthService; they never call a backend.
- Existing AuthService and frontend tests keep passing.

## Acceptance criteria
1. A new player has the `katana` icon and an empty description.
2. A player can change their own icon to any of the 8 keys; any other key returns 400 and changes nothing.
3. A description over 80 characters returns 400 and changes nothing. A description containing `<script>` is saved and shown as plain text.
4. `PATCH /account` only ever changes the signed-in player's own account.
5. `GET /users/:id` returns another player's public profile without their email; an unknown or malformed id returns 404.
6. `/profile` shows the player card, name, description, the four stats and the league row with the right ends (e.g. Gold I 600 to Gold II 700). Platinum shows a full bar and "Top league".
7. `/profile/[id]` shows the same layout with no edit controls; your own id redirects to `/profile`.
8. Clicking a player's name in the lobby or on the result screen opens their profile.
9. Every animation has a reduced-motion override.
