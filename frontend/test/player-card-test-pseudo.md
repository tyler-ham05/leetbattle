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
- Where WebP isn't supported, "Use picture" should upload a PNG export instead

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

## Existing tests this task changes
- `test/profile.test.tsx` "US-7-T-1 shows the player's league": the page no longer lists stats as `<dt>`/`<dd>`; it now reads the league name from the card.
- `test/profile.test.tsx` "US-7-T-1 shows the player's rating": now reads the rating from the screen-reader text, since the visible rating is an odometer.
- `test/profile.test.tsx` "US-7-T-1 shows the player's wins", "losses", "draws": now read the counted-up number from the stat boxes (with fake timers so the count finishes).
- `test/profile.test.tsx` "US-7-T-1 shows the date the player joined": the details now read "Joined January 2026" (month and year, per the US-7-T-5 spec), not "January 1, 2026".
