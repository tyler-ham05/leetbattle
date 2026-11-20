// US5-Task20: lobby redesign ("E · Live" on the Lobby redesign canvas) and its loaders (UI only; the lobby socket is mocked, no backend)

 // Loaders
 //  - Opening the lobby should play the katana slice
 //  - Opening the lobby should not play the team clash
 //  - When the user's match is starting, the team clash ("Leet" VS "Battle") should play
 //  - While the team clash is playing, the lobby should not have navigated to the game page yet
 //  - Once the team clash has finished, the lobby should navigate to the game page
 //  (the clash's VS losing its box is a CSS-only change in globals.css, checked by eye)

 // Headline
 //  - When 3 of 6 seats are filled, the headline should display "Waiting for 3 more"
 //  - When all 6 seats are filled and 4 players are ready, the headline should display "4 of 6 ready"
 //  - When all 6 seats are filled and every player is ready, the headline should display "Everyone is ready"
 //  - During the countdown with 3 seconds left, the headline should display "3"
 //  - During the countdown, screen readers should still hear "Starting match in 3…"

 // Team bars
 //  - With 2 of 3 Team 1 seats filled, Team 1's bar should be two thirds full
 //  - With 1 of 3 Team 2 seats filled, Team 2's bar should be one third full
 //  - During the countdown, both bars should be draining toward VS

 // Seats
 //  - A ready player's row should be marked ready (the team-colour sweep)
 //  - A player who is not ready should not be marked ready
 //  - The user's own row should show "You"

 // Choosing a team (open seats replace the "Join / Switch / Your team / Team full" buttons)
 //  - When the user has no team, Team 1's open seat should be a "Join Team 1" button
 //  - Clicking "Join Team 1" should send a join-team event with team "a"
 //  - When the user is on Team 2 and Team 1 has an open seat, it should be a "Switch to Team 1" button
 //  - When the user is on Team 1, Team 1's open seats should not be buttons
 //  - The "Your team" button should no longer be shown
 //  - An open seat the user can take should hold "Open seat" and "Join here" in the same spot, so one fades into the other

 // Display name (edited in the user's own row instead of a separate form)
 //  - The user's row should have an "Edit your display name" button
 //  - Clicking "Edit your display name" should show the "Display name" input
 //  - Typing a new name and clicking "Save name" should send a set-name event with the trimmed name

 // Top bar
 //  - The "Players per team" control should be in the top bar
 //  - The "Leave lobby" button should be in the top bar

 // (replaces: the "Fill both teams…" and "2/6 players ready" / "2/4 players ready" status tests, the
 //  "Your team" / "Switch to Team 1" / "Team full" / "Join Team 1" button tests, the "Saved" status test,
 //  the six seat-marker tests (the team bars replace them), and the old "navigates to the game page"
 //  test, which now waits for the team clash)
