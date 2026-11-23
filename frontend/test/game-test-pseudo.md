// US-6-T-2: Lobby should hand players over to the game
 //  - When "lobby:game-started" arrives with a gameId, the lobby should navigate to /game/<gameId>
 //  - After "lobby:ready-for-match" and before the gameId arrives, the status should display "Joining match…"

 // Game page should connect to the game socket for the game in the URL
 //  - On open, the page should connect using the gameId from the URL
 //  - While the socket is not connected, "Joining match…" should be displayed
 //  (LobbyService closes the lobby sockets itself once the game starts, so the page doesn't)

 // Game page should show connection problems
 //  - When the socket context has an error, its message should appear in an alert
 //  - When the connection fails, a link back to the lobby should be shown

 // Game page should show the match once connected
 //  - Each player's display name should be rendered
 //  - Team 1 should list its three players
 //  - A player who is not connected should display "Reconnecting…"
 //  - Each problem in the match pool should be listed
 //  - The time remaining should be displayed as minutes and seconds

 // Game socket context should connect with the player's identity
 //  - The socket should be opened with the login token and the gameId in its auth payload
 //  - A "game:state" event from the server should be exposed to the page
 //  - When the server rejects the connection with "not-in-game", a "not a player in this match" error should be exposed

 // Game page should show the match waiting for its players
 //  - While the game is waiting with 2 of 6 players connected, "Waiting for players (2/6)" should be displayed

 // Players should be able to forfeit from the top bar
 //  - During a match, a "Forfeit" button should appear in the top bar
 //  - The Forfeit button should sit to the left of the account menu button
 //  - While the game is waiting for players, the Forfeit button should not be shown
 //  - Clicking Forfeit should open a confirmation dialog
 //  - Clicking Cancel should close the dialog without forfeiting
 //  - Confirming should send the forfeit to the game
 //  - After confirming, the Forfeit button should be disabled

 // Game page should show the result once the game ends
 //  - When team b wins, "Team 2 wins" should be displayed
 //  - When the game was won by forfeit, "by forfeit" should be displayed
 //  - The result screen should have a "Back to lobby" link
 //  - When the game ends in a draw, "Draw" should be displayed
 //  - Once the game has ended, the Forfeit button should not be shown

 // Game socket context should handle the end of the game
 //  - A "game:ended" event from the server should expose the result to the page
 //  - Forfeiting should send a "game:forfeit" event to the server

 // Game page should show each problem's details
 //  - Each problem in the match pool should show its difficulty
 //  - Before a problem is picked, no problem description should be shown
 //  - Clicking a problem should load it from CodeService by its question_id
 //  - Once loaded, the clicked problem's description should be displayed
 //  - When the problem fails to load, an error should be displayed
 //  (CodeService's fetch is mocked; no test calls a real service)

 // Game page should show a win by solving every problem
 //  - When the game was won by solving every problem, "by solving every problem" should be displayed

// ============================================================================
// DRAFT (Claude, for review): ban phase on the game page. Edit / cut / reword before tests are written.
// The ban screen moves out of /ban into /game/[gameId] and shows while the game
// is "banning". All socket traffic is mocked; no test touches GameService.
// ============================================================================

 // Game page should show the ban screen during the ban phase
 //  - While the game is banning, "Ban a question" should be displayed
 //  - While the game is banning, the problem list for play should not be displayed
 //  - While the game is banning, the Forfeit button should not be shown
 //  - While the game is banning, the time left to ban should be displayed
 //  - Once the game is playing, "Ban a question" should not be displayed

 // Game page should run the ban screen from the game state
 //  - Each problem in the match pool should be shown on the ban screen by its topics
 //  - Clicking "Ban this question" should send that problem's questionId to the game
 //  - A problem the game state shows banned by another player should display "Banned by <name>"
 //  - With four players and one ban made, "1 of 4 bans made" should be displayed
 //  - With four players, the ban screen should display four ban markers (now the plain count "0 of 4 bans made", US-5-T-22)

 // Game socket context should send bans
 //  - Banning should send a "game:ban" event with the questionId to the server

// US-6-T-5: The game page should not list the match's questions
// (replaces "Each problem in the match pool should be listed" and "Game page should
// show each problem's details" above, which were removed with the list)
 //  - While the game is waiting for players, no question name should be displayed
 //  - While the game is playing, the "Problems" list should not be displayed

// US-6-T-6: Once the bans are in, the game page should show the practice editor
 //  - While the game is playing, the code editor should be displayed
 //  - While the game is banning, the code editor should not be displayed
 //  - While the game is waiting for players, the code editor should not be displayed
 //  - The editor should have one question tab per problem left after the bans
 //  - The editor should load each problem left in play from CodeService by its question_id
 // Submitting in a match should go through the game
 //  - Clicking "Submit" should submit the current question's id and code to the game
 //  - The game's grading result should be shown in the results panel
 //  - When the game refuses a submission with "cooldown", a readable message should be shown
 // Running code in a match should work like practice
 //  - Clicking "Run" should run the code against CodeService
 // A player's code should only go to their own team
 //  - Editing code should send it to the game (team-only relay), not to the lobby socket
 // Game socket context
 //  - Submitting should emit "game:submit" with the question id and code and resolve with the grading
 //  - A refused submission should reject with a readable message
 //  - Sharing code should emit "game:code" with the question id and workspace
 // The practice editor should keep working outside a match
 //  - Opening /editor should still load random practice problems

// ============================================================================
// DRAFT (Claude, for review): US-6-T-7, teammates' code view. Edit / cut /
// reword before tests are written. All socket traffic is mocked; no test
// touches GameService.
// ============================================================================

 // Game page should show a workspace switcher above the code editor
 //  - While playing, a "You" workspace tab and one tab per teammate should be shown above the code tabs
 //  - The workspace switcher should never show a tab for a player on the other team
 //  - With two teammates, only two teammate workspace tabs should be shown (three players max per team)
 //  - The "You" workspace should be selected by default
 //  - While banning or waiting for players, the workspace switcher should not be shown

 // Viewing your own workspace should work exactly as before
 //  - Selecting "You" after viewing a teammate should restore your own editable tabs and code
 //  - Your own code should never be replaced by anything received from a teammate (push only)

 // Viewing a teammate's workspace should be read only
 //  - Selecting a teammate should show the question they are currently on
 //  - Selecting a teammate should show their current tabs (e.g. "Tab 1", "Tab 2")
 //  - The Monaco editor should not accept input while viewing a teammate's tab
 //  - The teammate's tab strip should not show a "Create new tab" button
 //  - The teammate's tab strip should not open a context menu (no copy/rename/remove) on right-click
 //  - Clicking one of the teammate's other tabs should show that tab's code, still read only
 //  - A teammate's code update (received over the socket) should update the read-only view live
 //  - A teammate who hasn't shared any code yet should show their starter code for the question they're on

 // Game socket context should expose teammates' code
 //  - A received "game:code" event should be stored under the sending teammate's userId and questionId
 //  - On connecting, a "game:code:snapshot" of teammates' saved workspaces should be loaded into state
 //  - A later "game:code" event for the same teammate and question should replace, not merge with, the earlier one

 // Game page should show the live team score
 //  - The team score shown in the header should match the game state's scores
 //  - A new game state with an updated score should update what's shown, without needing to submit again


 // US-6-T-11: The result screen should tell the player whether they won
 //  - When the player's team wins, "Victory" should be displayed
 //  - When the player's team wins, "Defeat" should not be displayed
 //  - When the other team wins, "Defeat" should be displayed
 //  - When the other team wins, "Victory" should not be displayed
 //  - When the game is a draw, neither "Victory" nor "Defeat" should be displayed
 //  - When the signed-in user isn't one of the match's players, neither "Victory" nor "Defeat" should be displayed
 // The result screen should show the final scores
 //  - With scores of 450 to 300, the "Final scores" list should show "Team 1 450" then "Team 2 300"
 //  - A team that finished on 0 points should show "0" in the "Final scores" list
 // The rest of the result screen should stay as it was
 //  - The "Team 1 wins" heading should still be displayed
 //  - The line explaining why the game ended should still be displayed
 //  - The "Back to lobby" link should still be displayed

 // US-6-T-12: The top bar should show the player's connected teammates next to Forfeit
 //  - During a match, the "Teammates" list in the top bar should show each connected teammate's name
 //  - The "Teammates" list should not include the signed-in player
 //  - The "Teammates" list should not include players on the other team
 //  - The "Teammates" list should not include a teammate who is disconnected
 //  - The "Teammates" list should sit to the left of the Forfeit button
 //  - While the game is waiting for players, the "Teammates" list should not be shown
 //  - While the game is banning, the "Teammates" list should not be shown
 //  - Once the game has ended, the "Teammates" list should not be shown
 //  - When every teammate is disconnected, the "Teammates" list should not be shown
