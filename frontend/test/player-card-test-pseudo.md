# Player profiles: the player card (US-7-T-5, frontend)

(AuthService is mocked: the auth context and `AuthAPIService` are replaced with fakes, or `fetch` is stubbed for the API client. No test calls a backend service. Acceptance criteria numbers from `docs/tasks/sprint-4/US-7-T-5.md` are in brackets.)

## AuthService client (`app/login/controller.tsx`)
- getUser("u2") should send GET /users/u2 with the bearer token [AC6]
- getUser should return the public profile from `{ user }` [AC6]
- getUser should return null when AuthService answers 404 [AC6]
- updateProfile({ icon: "bolt" }) should send PATCH /account with `{ icon: "bolt" }` [AC2]
- updateProfile({ description }) should send PATCH /account with `{ description }` [AC3]
- setPicture(dataUrl) should send PUT /account/picture with `{ image: dataUrl }` [AC4]
- removePicture() should send DELETE /account/picture [AC4]

## The own profile page, /profile [AC7]
- The page should reload the player's data from GET /me when it opens
- The page heading should be the player's name
- The page should show the description beside the name
- The page should show "Joined January 2026"
- The card should show "LeetBattle" and "Ranked" across the top
- The card should show the league name
- The page should give screen readers the rating as text
- The page should show the four stats: Wins, Losses, Draws and Win rate, each with its number once counted up
- The Win rate stat should read the rounded percentage (24 of 44 is "55%")
- The Wins stat should have a detail line "of 44 matches"
- The league row's left end should read the league and its lowest rating ("Gold I" and "600")
- The league row's right end should read the next league and where it starts ("Gold II" and "700")
- The league bar should be as full as the rating is far between the ends (684 between 600 and 700 is 84)
- A Platinum player (nextLeague null) should see "Top league" at the right end
- A Platinum player's bar should be full (100)
- The page should not show the player's email
- The page should set the shine to the league's place out of 12 (Gold I is 6 / 12 = 0.5)
- The page should set the metal colour from the league's metal (Gold I uses --lb-metal-gold)
- No number on the page should use the mono font

## The odometer
- The rating odometer should have one slot per digit (684 has 3)
- The slot for a "1" should be narrower than the slot for an "8" (each slot is as wide as its digit)

## The avatar and the picker [AC8]
- Without a picture, the avatar should draw the chosen icon (an svg, no img)
- With a picture, the avatar should show it as an img whose src is the data: URL
- Clicking your own avatar should open the picker
- The picker should list the 8 icons
- The picker should have "Upload a picture"
- Without a picture, the picker should have no "Remove picture"
- With a picture, the picker should have "Remove picture"
- Choosing "Bolt" should call updateProfile({ icon: "bolt" })
- After choosing an icon, the avatar should show the icon from the saved profile (spinning in with lb-pc-swap)
- Choosing "Remove picture" should call removePicture()
- Escape should close the picker

## The crop dialog [AC8]
- Choosing a GIF should show "Choose a PNG, JPEG or WebP picture." instead of the picture
- Choosing a picture over 8 MB should show "That picture is over 8 MB. Choose a smaller one."
- Choosing a PNG should open the dialog "Crop your picture"
- The dialog should have a Zoom slider
- Pressing "+" on the picture should zoom in
- Pressing Escape should close the dialog
- Pressing Escape should not upload anything
- "Use picture" should upload the 256x256 WebP export with setPicture

## Description editing [AC3, AC8]
- An empty description should show "Add a short description"
- The pencil "Edit description" should open a field named "Description" in the same slot
- The field should be limited to 80 characters
- Typing "hello" should make the count read "5 / 80"
- Submitting the form (Enter) should call updateProfile({ description: "hello" }), trimmed
- Escape should close the field
- Escape should not call updateProfile
- Cancel should not call updateProfile
- A description containing `<script>` should be shown as text
- A description containing `<script>` should not add a script element

## Another player's profile, /profile/[id] [AC9]
- The page should load the player with getUser(id)
- The page heading should be the other player's name
- The page should have no "Edit description" button
- The page should have no "Add a short description" button when their description is empty
- The avatar should not be a button ("Change your icon" is absent)
- Opening your own id should redirect to /profile
- An id AuthService doesn't know (getUser returns null) should show "Player not found"

## Opening a profile [AC10]
- In the lobby, a player's name should link to /profile/<userId>
- On the result screen, a player's name should link to /profile/<userId>
- The user menu should keep its "Profile" link to /profile (existing test in profile.test.tsx)

## Motion rules (globals.css) [AC11]
- The card swinging in (lb-pc-card) should have a reduced-motion override
- The name's letters (lb-pc-letter) should have a reduced-motion override
- The odometer (lb-pc-odo) should have a reduced-motion override
- The league bar and its shine (lb-pc-fill) should have a reduced-motion override
- The icon spinning in (lb-pc-swap) should have a reduced-motion override
- The picker and editor popping in (lb-pc-pop) should have a reduced-motion override
- The foil (lb-pc-holo) should have a reduced-motion override
- The card's entrance should fill backwards so it doesn't hold transform after it ends
- The metal colours should be defined for light mode as well as dark (--lb-metal-gold under [data-mode="light"])

## Saving icons and pictures fails (AC8)
- If saving a chosen icon fails, the card should say "Couldn't save your icon. Try again."
- If removing the picture fails, the card should say "Couldn't remove your picture. Try again."
- Opening the picker again should clear the message

## Fixes from the code review (AC7, AC8)
- A player without a name should show their displayName (from AuthService) as the profile heading
- If there's no displayName either, the heading should fall back to the part of the email before the @
- The player card should show the same name
- Where the browser can't export WebP, the crop should export JPEG (not PNG, which can go over 200 KB)
- After saving a change, the page should reload the account from AuthService so it never shows stale data

## Reaching the profile (AC7)
- The account menu should list only Profile and Settings (then Log out): Home, Practice and Lobby are on the home screen, and the LeetBattle logo goes home from any page

## Existing tests this task changes
- `test/profile.test.tsx` "US-7-T-1 shows the player's league": the page no longer lists stats as `<dt>`/`<dd>`; it now reads the league name from the card.
- `test/profile.test.tsx` "US-7-T-1 shows the player's rating": now reads the rating from the screen-reader text, since the visible rating is an odometer.
- `test/profile.test.tsx` "US-7-T-1 shows the player's wins", "losses", "draws": now read the counted-up number from the stat boxes (with fake timers so the count finishes).
- `test/profile.test.tsx` "US-7-T-1 shows the date the player joined": the details now read "Joined January 2026" (month and year, per the US-7-T-5 spec), not "January 1, 2026".

## Last 10 matches (`recentMatches`, oldest first, up to 10) [AC7, AC9]
- The own profile should have a section "Last 10 matches"
- With W, L, W, W, W last, the header should read "3 wins in a row"
- With one loss last, the header should read "1 loss in a row"
- With a draw last, the header should read "Last match a draw"
- The header should show the net change of the matches ("Net +62" for +16, −15, +20, +25, +16)
- A negative net should use a real minus sign ("Net −14")
- The chart should draw one line segment per match (5 matches, 5 segments)
- A win's segment should be the win colour (class W), a loss's L, a draw's D
- The line should have no fill under it (no area path)
- The chart should label the current rating at the right end (the last match's ratingAfter)
- The chart should say "10 matches ago" and "Now" under the baseline
- The chart should label round rating values on the left
- Each match should be focusable and named for screen readers ("Win in 2v2, +16, 702 rating, today")
- Focusing a match should show a tooltip reading "Win in 2v2 +16"
- The tooltip's second line should read "<rating> rating, <when>" ("702 rating, today")
- Hovering a match should show the same tooltip
- Leaving the chart should hide the tooltip
- A match played yesterday should read "yesterday"; three days ago "3 days ago"
- teamSize 1 should read "1v1", 3 should read "3v3"
- With no matches (empty, or a backend that sends no `recentMatches`), the section should say "No ranked matches yet" and draw no chart
- Another player's profile should show their last matches too

## Demo panel (own profile, development only)
- With NODE_ENV "test", there should be no Demo panel
- With NODE_ENV "production", there should be no Demo panel
- With NODE_ENV stubbed to "development", the own profile should show the Demo panel
- Another player's profile should never show the Demo panel, even in development
- The panel should say "Local only, nothing is saved"
- Win should raise the shown rating (684 becomes 698 to 702)
- Win should not call any AuthAPIService method
- Lose should lower the shown rating
- Win should add one win to the Wins stat's detail ("of 45 matches")
- Win should add a match to the Last 10 matches chart
- After 10 matches, a Win should keep the chart at 10 (the oldest drops off)
- Win from 695 (Gold I, next Gold II at 700) should show the "Promoted Gold II" toast
- The promotion should peel the old league name off (lb-pc-peel) on the league row
- Lose from 602 (Gold I, from 600) should shake the league name (lb-pc-shake) and show Silver III
- Win should float the change by the rating ("+16" style, lb-pc-delta)
- After a promotion the card's shine should follow the new league (Gold II is 7 / 12 = 0.583)
- The demo league table should match AuthService's (Bronze I from 1, Gold II from 700, Platinum from 2000, nothing above Platinum)

## Card depth (between the card and the page; the card itself looks as before)
- A cast shadow (lb-pc-cast) should sit on the page right behind the card (the element just before the card)
- The cast shadow should be hidden from screen readers
- The cast shadow should move with the pointer's light offset (--lb-pc-lx / --lb-pc-ly), opposite the tilt
- The page close to the card's edges should darken a little (an ambient-occlusion ring around the card's spot, lb-pc-zone::before, which doesn't move)
- The card's own look should be unchanged: it still sets overflow: hidden and its original box-shadow

## Motion rules for the new parts (globals.css)
- The cast shadow (lb-pc-cast) should have a reduced-motion override (it stays put)
- The peel (lb-pc-peel) should have a reduced-motion override
- The shake (lb-pc-shake) should have a reduced-motion override
- The toast (lb-pc-toast) should have a reduced-motion override
- The floating change (lb-pc-delta) should have a reduced-motion override
- The chart's line drawing itself in (lb-pc-seg) should have a reduced-motion override
- The shake should not hold its end state (no forwards or both fill)
- The line drawing in should fill backwards
- navigation.test.tsx "links to Home, Practice, Lobby, Profile and Settings" becomes "links to Profile and Settings": the account menu no longer repeats the home screen's pages
- player-card.test.tsx "uploads a PNG export where WebP isn't supported" is replaced by "exports JPEG where the browser cannot export WebP" (code review: a full-size PNG can go over the 200 KB limit)
