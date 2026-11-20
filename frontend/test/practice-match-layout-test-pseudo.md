// US5-Task19: practice and match layout (UI only; CodeService fetch, the game socket and Monaco are mocked, no backend)

 // Practice page has no match parts
 //  - The practice page should not show "Team 1"
 //  - The practice page should not show "Team 2"
 //  - The practice page should not show a "Time left" timer
 //  - The practice page should not show a "Team chat" panel

 // Only the first three test cases are visible
 //  - A problem with 15 test cases should show a "Case 1" tab
 //  - A problem with 15 test cases should show a "Case 3" tab
 //  - A problem with 15 test cases should not show a "Case 4" tab
 //  - A problem with 15 test cases should show "+12 hidden, run on submit"
 //  - A problem with 2 test cases should show a "Case 2" tab
 //  - A problem with 2 test cases should not show "hidden, run on submit"
 //  - Clicking "Run" on a problem with 15 test cases should send only the first 3 cases to CodeService
 //  - Clicking "Submit" in practice should still send only the code and question id (CodeService runs every case)

 // The match fills the page while playing
 //  - While playing, the "Match" heading should not be shown
 //  - While playing, the "Team 1 players" list should not be shown
 //  - While playing, the "Team 2 players" list should not be shown
 //  - While banning, the "Team 1 players" list should still be shown

 // Score and time sit in the middle of the top bar while playing
 //  - The top bar should show "Team 1"
 //  - The top bar should show "Team 2"
 //  - With scores of 120 to 80, the top bar should show "120" for Team 1
 //  - With scores of 120 to 80, the top bar should show "80" for Team 2
 //  - With 754 seconds left, the top bar should show "12:34"
 //  - The top bar should still show the "Forfeit" button

 // Teammate tabs show who is disconnected
 //  - A connected teammate's tab should not be labelled "disconnected"
 //  - A disconnected teammate's tab should be labelled "<name>, disconnected" for screen readers
 //  - A disconnected teammate's tab should be faded
 //  - A disconnected teammate's tab should show the disconnected (crossed-out wifi) icon
 //  - A disconnected teammate's tab should still open their read-only code when clicked
 //  - When a disconnected teammate reconnects, their tab should no longer be faded

 // Viewing a teammate's code
 //  - Viewing Grace's code should show "Grace's code, read only" in the code tab bar
 //  - Viewing Grace's code should not show the "Viewing Grace's workspace (read only)" banner

 // Lobby: the switch-team button in a 1v1 (bug fix)
 //  - With a team size of 1, when the user is on Team 2 and Team 1 is empty, the Team 1 button should display "Switch to Team 1"

 // (replaces: US4-Task4 "shows the scoreboard when the match screen loads", US-3-T-1 "shows a Team chat
 //  panel when the match screen loads" -- both rendered the practice page; US-6-T-2 roster tests now
 //  render the banning phase instead of playing)
