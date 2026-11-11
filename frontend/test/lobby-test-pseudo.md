// Lobby should display each player's ready status
 //  - When no players are ready, all six players should display "Not ready"
 //  - When a player is ready, their status should display "Ready"

 // Players should be able to toggle their ready status
 //  - Clicking "Ready up" should send a ready event to the server
 //  - Clicking "Unready" should send a not-ready event to the server

 // Ready up should only be available when the lobby is eligible
 //  - When the lobby is not eligible, the "Ready up" button should be disabled

 // Lobby should show the countdown and readiness summary
 //  - When countdownSecondsRemaining is 3, the status should display "Starting match in 5…"
 //  - When canReady is false and there is no countdown, the status should display "Fill both teams with connected players to ready up"
 //  - When canReady is true and 2 players are ready, the status should display "2/6 players ready"

 // Lobby should show errors and match readiness
 //  - When the socket context has an error, its message should appear in an alert
 //  - When matchReadiness is set, the "ready for the match" banner should be displayed

 // Lobby should handle players who have not joined
 //  - When the current user is not in the lobby, a "Join lobby" button should be shown
 //  - Clicking "Join lobby" should send a join event to the server
 //  - When the lobby has 6 players and the user is not in it, "This lobby is full." should be displayed
 //  - When the lobby is full, the "Join lobby" button should be disabled

 // Lobby should show connection state
 //  - When the socket is not connected, "Connecting to lobby…" should be displayed
 //  - When a player is disconnected, their status should display "Reconnecting…"

 // Players should be able to choose and switch teams
 //  - When the user has no team, the button should display "Join Team 1"
 //  - Clicking "Join Team 1" should send a join-team event with team "a"
 //  - When the user is on Team 1, Team 1's button should display "Your team"
 //  - When the user is on Team 2 and Team 1 has space, the button should display "Switch to Team 1"
 //  - When the user has no team and Team 1 has 3 players, the button should display "Team full"

 // Players should be able to change their display name
 //  - Typing a new name and clicking "Save name" should send a set-name event with the trimmed name
 //  - After saving, a "Saved" status should be displayed
 //  - When the input matches the current name, "Save name" should be disabled

 // Players should be able to leave the lobby
 //  - Clicking "Leave lobby" should send a leave event to the server
