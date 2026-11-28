---
id: US-7-T-5
story: US-7
sprint: 4
assignee: woozoo21 (Sashreek Rewatkar)
estimate_hours: 4
---

# Player profiles: a player card with a picture or icon, a description, the league and the record

## Description
Serves US-7, More Fleshed-Out Matchmaking (#175), issue #182. The plain `/profile` page from US-7-T-1 becomes a player profile built around a **player card**: a trading-card-style panel that tilts toward the pointer and shines more the higher the player's league. Beside it: the player's name with a one-line description, their record, and their league with a progress bar to the next one. Players choose a preset icon or upload and crop their own round picture, and write their own description; nobody else can change them. Anyone signed in can open another player's profile from the lobby or the match result screen.

The approved design is the player-card mock-up: https://claude.ai/artifact/McteyJApVUK5zThUHRjTpo. Its "Demo" panel (Win, Lose and the last-10 switcher) is for trying the motion only and is not part of the page.

Out of scope: achievements, reporting or moderating pictures, and showing a player's email to anyone else. The promotion animation only plays in the local demo (below), because a profile page never sees a rating change live.

## Specs

### Data (`service/AuthService/sql/schema.sql`)
`users` gains these columns, all added with `ADD COLUMN IF NOT EXISTS`:
- `icon TEXT NOT NULL DEFAULT 'katana'`
- `description TEXT NOT NULL DEFAULT ''`
- `picture BYTEA` (null means no picture)
- `picture_type TEXT`

### Icons
- A player picks one of 8 preset icons: `katana`, `brackets`, `terminal`, `bolt`, `flame`, `crown`, `cube`, `moon`.
- AuthService keeps the list of allowed keys (`service/AuthService/src/utils/profile.ts`, `ICONS`). The frontend draws them (`frontend/app/_shared/profile-icons.tsx`) from the same keys.

### Profile picture
- **Cropping happens in the browser.** The player chooses a PNG, JPEG or WebP file (up to 8 MB on their device), then drags and zooms it inside a circle. "Use picture" exports a 256×256 square image (WebP, or PNG where WebP isn't supported), which the page shows through a circle. Only that small image is uploaded.
- **AuthService checks the upload.** `PUT /account/picture` takes `{ "image": "data:image/<type>;base64,<data>" }`.
  - It checks the decoded bytes, not the stated type: PNG, JPEG or WebP only.
  - The decoded image can be at most 200 KB; anything else returns 400.
  - It stores the bytes and the type.
- **The picture is sent inside the profile.** `GET /me` and `GET /users/:id` return `picture` as a `data:` URL, or `null`, so no separate image route is needed.
- **Removing it:** `DELETE /account/picture` removes the picture. Choosing a preset icon in the picker also removes it.
- **What shows:** the round picture where there is one, otherwise the chosen icon.

### Match history and the "Last 10 matches" chart
- AuthService keeps a `match_history` table. Each row holds the user, the game, the result (`W`, `L` or `D`), the rating change, the rating after the match, the team size and when it was played.
- `POST /internal/match-results` writes one row per updated player, in the same transaction that updates the ratings. Unknown players get no row, and the endpoint's response doesn't change.
- `GET /me` and `GET /users/:id` return `recentMatches`: the last 10 matches, oldest first, each `{ result, change, ratingAfter, teamSize, playedAt }`. It's an empty array for a new player.
- **The chart:** the bottom of the right column shows "Last 10 matches" as a rating line.
  - The line has green segments for wins, red for losses and grey for draws. It draws itself in and has no fill under it.
  - Minimal axes: faint gridlines at round ratings with small labels, a baseline with "10 matches ago" and "Now", and the current rating at the end of the line.
  - Hovering or focusing a match shows it, e.g. "Win in 2v2 +16" and "684 rating, yesterday".
  - The header shows the current streak and the net change.
  - It is the only part of the column that shrinks when space is short.
  - With no matches yet, it reads "No ranked matches yet".

### Leagues for the profile
- AuthService already has the league table (`leagueFor` in `src/utils/rating.ts`, from US-7-T-1). Next to `league` it now also returns:
  - `leagueMin`: the lowest rating in the player's league (e.g. 600 for Gold I);
  - `nextLeague`: `{ "name": "Gold II", "at": 700 }`, or `null` in Platinum.
- The frontend doesn't copy the league table.

### AuthService API
- `GET /me` also returns `icon`, `description`, `picture`, `leagueMin` and `nextLeague`.
- `PATCH /account` (signed in) also accepts `icon` and `description`.
  - Each is optional, but a body with none of `name`, `icon` and `description` returns 400.
  - `icon` must be one of the 8 keys, else 400.
  - `description` is trimmed and must be at most 80 characters after trimming, else 400. An empty string clears it.
- `PUT /account/picture` and `DELETE /account/picture` (signed in), as above.
- All of these change only the signed-in account, from the token. There is no user id in the body, so nobody can change another player's profile.
- New `GET /users/:id` (signed in) returns one player's public profile: `{ id, name, icon, description, picture, rating, league, leagueMin, nextLeague, wins, losses, draws, createdAt }`.
  - It never includes `email` or `emailVerified`.
  - An id that isn't a UUID, or a user that doesn't exist, returns 404.

### Frontend: the profile page
- `/profile` shows the signed-in player's own profile from `GET /me`. It can be edited.
- `/profile/[id]` shows another player's profile from `GET /users/:id`. It is read-only, with no edit controls, and opening your own id redirects to `/profile`.
- **Layout (laptop and wider):**
  - The page fills exactly one window and never scrolls.
  - A 30 / 70 split across the full width, with generous margins (about 6% at the sides and about 10% of the height at the top and bottom).
  - The card fills the left column, reaches a little into the top and bottom space, and keeps its height whatever happens on the right.
  - Below 860px wide, the card sits above the details at trading-card proportions (5:7), and the page scrolls.
- **The card:**
  - "LeetBattle" and "RANKED" across the top.
  - The round picture or icon.
  - The name, the league in its metal colour, the rating, and Wins, Losses and Draws.
  - On your own card, clicking the picture opens a picker: the 8 icons, "Upload a picture", and "Remove picture" when you have one. Choosing an icon saves it (`PATCH /account`). The new picture or icon spins in.
- **The crop dialog:**
  - A circle frame over the picture, with everything outside it dimmed.
  - Drag to move the picture, and use the slider or the scroll wheel to zoom. The picture always fills the circle.
  - Keyboard works too: the arrow keys move it (with Shift, further), "+" and "−" zoom, and Esc cancels.
  - A file that isn't PNG, JPEG or WebP, or is over 8 MB, shows a message instead of the picture.
- **The details:**
  - "JOINED <MONTH YEAR>".
  - The name, in the heaviest weight with tight spacing. The description sits in the space to its right, in a fixed two-line slot.
  - Four stats in boxes with centred text: Wins, Losses, Draws, Win rate. Hovering or focusing a stat fades in one detail line (e.g. "of 44 matches") in space that is always reserved, so nothing moves.
- **Description editing (own profile only):**
  - A pencil next to the description, or "Add a short description" when it's empty, opens an inline field in the same slot.
  - The field shows a live "n / 80" count, with Cancel and Save beside it. Nothing on the page moves.
  - Enter submits the form and Esc cancels.
  - The description is always shown as plain text, never as HTML.
- **League row:**
  - The league name in its metal colour (solid, no shimmer) and the rating.
  - A bar from `leagueMin` to `nextLeague.at`, with the two ends labelled with league and number (e.g. "Gold I 600" and "Gold II 700"). In Platinum the bar is full and the right end reads "Top league".
  - Nothing in the right column squashes when space is short.
- **Metal colours:** fixed hues like the difficulty colours, one each for Bronze, Silver, Gold, Diamond and Platinum, with a dark and a light shade so they read in both modes.
- **Background:** a soft pool of the metal colour behind the card, and fine film grain. No large background text.

### Frontend: opening a profile
- In the lobby (`frontend/app/lobby/page.tsx`) and on the result screen (`frontend/app/game/components/result-screen.tsx`), every player's name links to `/profile/<userId>`.
- The user menu keeps its "Profile" link to `/profile`.

### Motion (`app/globals.css` MOTION section, `docs/frontend/animation.md`)
- **The card has depth like a layered trading card:**
  - an inner shadow around its inside edge, a light bevel along the top and shade along the bottom;
  - the avatar, name and record on separate layers that shift at different depths as it tilts;
  - soft shadows under the avatar, under the rating and under the whole card, which move against the tilt.
- **The card:**
  - It swings up when the page opens.
  - While the pointer is over it, it tilts toward the pointer, and a foil, a glitter and a soft glare follow the pointer.
  - Its border is a quiet 1px line at rest. Where the pointer's light reaches the edge, the border shines bright.
- **Shine grows with the league:** Bronze I is nearly matte and Platinum is full foil. There is no white sweep and no glow.
- **The rating is an odometer:** each digit rolls to its number. Each digit's slot is as wide as that digit, so numbers never look unevenly spaced.
- **Other numbers** count up when the page opens.
- **The league bar** grows from the left, with a slow shine moving along it.
- **The name's letters** drop in one by one.
- **The light behind the card** moves a little as the card tilts.
- **Reduced motion:** no tilt, no shine movement, no rolling or counting. Everything shows in its final state.

### Type and theme
- Text and numbers use the app's Onest font, with natural digit spacing.
- Only the theme classes in `docs/frontend/theming.md` are used, plus the five metal colours, which are added as `--lb-*` variables for both modes.
- No icons next to stats or labels, no dots or dotted lines, and no "·" between words.
- Corners are small (about 4–12px), except the round picture.

## Demo (local development only)
The demo shows the card at its shiniest and lets you play the league animations. None of it exists in a production build.

- **Demo player:** `POSTGRES_PORT=5433 npm run seed-demo` (from the repo root, while the local database is running) creates or refreshes a demo player in the local database only. Log in as **demo@leetbattle.local** with the password **demo-password**. The demo player is Platinum (rating 2046, 78–39–3) with ten recent matches, so the full foil, the edge light and the chart all show. Running the seed again resets the demo player; no other account is touched. Use `POSTGRES_PORT=5432` instead if your local database is on the default port.
- **Win / Lose panel:** when the frontend runs with `npm run dev` (`NODE_ENV=development`), your own profile shows a small "Demo" panel at the top with Win and Lose buttons. They change only what's on screen and never call the API:
  - the rating rolls and a "+16" floats up;
  - the chart extends;
  - crossing into a new league peels the old league name away and shows a "Promoted" banner;
  - dropping a league shakes the name;
  - the card's shine follows the league.

  Reload the page to go back to the real numbers. The demo uses its own copy of the league table (`frontend/app/profile/components/demo-leagues.ts`).
- **Typical run:**
  1. `npm run start` (database, services and frontend). If port 5432 is taken by another Postgres, use `POSTGRES_PORT=5433 npm run start`.
  2. In another terminal, run `POSTGRES_PORT=5433 npm run seed-demo` (or 5432).
  3. Open http://localhost:3000, log in as the demo player and go to **Profile** in the account menu.
  4. Press **Lose** a few times to fall out of Platinum and watch the shine fade, then **Win** to climb back and see the promotion.
- **Running the AuthService tests safely:** the tests empty the `users` table. Run them against a separate database, never the one the app uses, for example `AUTH_POSTGRES_DB=auth_service_test POSTGRES_PORT=5433 npx vitest run` in `service/AuthService`, after creating `auth_service_test` once in the local Postgres.

## Requirements
- Only the signed-in player can change their icon, picture and description, using their own token.
- Descriptions are limited to 80 characters on the server and are always rendered as text. There is no `dangerouslySetInnerHTML` or similar.
- Pictures are checked by their bytes (PNG, JPEG or WebP magic numbers) and size (at most 200 KB) on the server. They are only ever shown as an image (`<img src="data:...">`), never as markup.
- `GET /users/:id` never sends an email address.
- No new runtime dependencies. Cropping uses the browser's canvas, and the card effects are CSS with a small amount of plain pointer code.
- The JSON body limit is raised only for `PUT /account/picture`, enough for a 200 KB image in base64.
- Before this is merged, whoever manages GCP adds the four new `users` columns and the `match_history` table to the deployed AuthService database. Otherwise `GET /me` fails.
- The Win / Lose demo panel only renders when `NODE_ENV` is `development`. Players can never change their own rating.
- New AuthService tests go in `service/AuthService/test/`. Frontend tests go in `frontend/test/` and mock AuthService; they never call a backend.
- Existing AuthService and frontend tests keep passing.

## Acceptance criteria
1. A new player has the `katana` icon, an empty description and no picture.
2. A player can change their own icon to any of the 8 keys; any other key returns 400 and changes nothing.
3. A description over 80 characters returns 400 and changes nothing. A description containing `<script>` is saved and shown as plain text.
4. A PNG, JPEG or WebP picture of at most 200 KB is saved and returned as a `data:` URL; any other file, or a larger one, returns 400 and changes nothing. Removing it returns the player to their icon.
5. Profile changes only ever affect the signed-in player's own account.
6. `GET /users/:id` returns another player's public profile without their email; an unknown or malformed id returns 404.
7. `/profile` shows the player card, the name with the description beside it, the four stats and the league row with the right ends (e.g. Gold I 600 to Gold II 700). Platinum shows a full bar and "Top league".
8. Choosing an icon, uploading a cropped picture, removing it and editing the description all work from `/profile`, and nothing on the page moves while editing.
9. `/profile/[id]` shows the same layout with no edit controls; your own id redirects to `/profile`.
10. Clicking a player's name in the lobby or on the result screen opens their profile.
11. After a reported match, both players' profiles list it first in `recentMatches` with the right result, change, rating and team size; only the last 10 are returned, oldest first.
12. The "Last 10 matches" chart shows those matches as a rating line with axes, or "No ranked matches yet".
13. The Win / Lose demo panel appears only in development builds and never calls the API.
14. Every animation has a reduced-motion override.
