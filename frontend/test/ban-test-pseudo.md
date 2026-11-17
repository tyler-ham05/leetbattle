// Issue #69: screen where each player bans one question (UI only, all tests use mocked questions and bans, no backend)

 // The ban screen should display the nine questions by topic only
 //  - When the match has nine questions, nine questions should be displayed
 //  - Each question should be labelled "Question 1" to "Question 9"
 //  - Each question should display its topics
 //  - A question should not display its name

 // A player should be able to choose a question to ban
 //  - When the player has not banned yet, every open question should display "Ban this question"
 //  - Clicking "Ban this question" should ask to ban that question
 //  - When the player has not banned yet, the status should display "You have 1 ban left. Choose a question to remove."

 // Banned questions should show who banned them
 //  - A question banned by another player should display "Banned by <name>"
 //  - A question banned by the signed-in player should display "Banned by you"
 //  - A banned question should not display "Ban this question"
 //  - The name of a Team 1 player who banned should use the primary colour
 //  - The name of a Team 2 player who banned should use the secondary colour

 // A player only gets one ban
 //  - When the player has banned, no question should display "Ban this question"
 //  - When the player has banned, the open questions should display "Still in play"
 //  - When the player has banned, the status should display "Your ban is in. Waiting for the other players."

 // The ban screen should show how many bans are in
 //  - When three players have banned, "3 of 6 bans made" should be displayed
 //  - The screen should always display six ban markers
 //  - When two Team 2 players have banned, two ban markers should be marked for Team 2

// Issue #95: ban screen flow (still no backend: sample questions, the editor move is a mocked router)

 // A ban should show up on the sample questions
 //  - With the sample questions, clicking "Ban this question" should display "Banned by you"

 // When every ban is in, the match should move on to the editor
 //  - When six players have banned, "All bans are in" should be displayed
 //  - When six players have banned, the player should be sent to the editor
 //  - When five players have banned, the player should not be sent to the editor
