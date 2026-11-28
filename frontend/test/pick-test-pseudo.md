// US-8-T-2: screen where each player picks one of the questions left after
// banning, shown on the game page during a new "picking" phase (UI only; all
// tests use mocked problems and picks, no backend). Modelled closely on
// ban-screen.tsx / ban.test.tsx.
//
- Users should be able to select questions for 20 seconds
- A user should be able to select a maximum of ceil(# of questions / # of teammates) questions
- Users should not be able to select questions their teammates have already selected
- The questions each user selects should be saved to the server through the websocket connection
- A user should be able to deselect a question they picked
- The pick screen should show each question's title instead of its topics (unlike the ban screen, which keeps the title hidden)

