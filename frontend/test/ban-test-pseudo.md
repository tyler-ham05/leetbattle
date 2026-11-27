// SUPERSEDED by ban-vote-pseudo.md (US-8-T-1): bans are a team vote now, so
// the per-player ban cases below no longer describe the screen.
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
 //  - The screen should always display six ban markers (replaced by a plain "0 of 6 bans made" count, US-5-T-22)
 //  - When two Team 2 players have banned, two ban markers should be marked for Team 2 (dropped with the markers, US-5-T-22)

// ============================================================================
// DRAFT (Claude, for review): changes to the Issue #69 tests above now that bans are real.
// The ban screen becomes a component the game page renders, given the questions,
// the player count and a ban callback as props (no more BanProvider / sample
// questions, and the standalone /ban route goes away). The tests above keep
// their behaviour and render that component with mocked props instead of the page.
//   - "The screen should always display six ban markers"
//       -> "The screen should display one ban marker per player in the match"
//   - "When three players have banned, "3 of 6 bans made" should be displayed"
//       -> keep, with six players in the mocked match
// ============================================================================

 // The ban screen should describe the match size
 //  - With six players, the intro should say the match is played on the three questions that are left
 //  - With two players, the intro should say the match is played on the seven questions that are left

// ============================================================================
// DRAFT (Claude, for review): US-6-T-10 changes the pool size by team size
// (see the matching DRAFT in socket-test-pseudo.md and the new
// pick-test-pseudo.md). This affects the fixtures above, not the ban
// screen's own behaviour:
//   - The nine-problem pool stops being a constant: it becomes 2*teamSize
//     Easy + 1*teamSize Medium, so only the 3v3 case keeps nine. The mocked
//     openProblems above (always nine) can stay as a 3v3 fixture, but a
//     2v2 ban-screen test needs a six-problem mocked pool instead.
//   - A 1v1 no longer reaches the ban screen at all (see
//     pick-test-pseudo.md), so the two-player (1v1) cases above -- "shows
//     one ban marker per player in the match" and "played on the seven
//     questions that are left" -- should be dropped, or changed to a 2v2
//     case instead.
// ============================================================================
