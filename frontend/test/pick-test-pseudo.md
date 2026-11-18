// US-6-T-10: screen where each player picks one of the questions left after
// banning, shown on the game page during a new "picking" phase (UI only; all
// tests use mocked problems and picks, no backend). Modelled closely on
// ban-screen.tsx / ban.test.tsx.
//
// ============================================================================
// DRAFT (Claude, for review). Rules this draft assumes (see the matching
// DRAFT in socket-test-pseudo.md and the note appended to ban-test-pseudo.md)
// -- edit / cut / reword before tests are written:
//   - After banning, exactly `teamSize` problems are left, shared by both
//     teams: 3 in a 3v3, 2 in a 2v2. A 1v1 never reaches this screen at all
//     (it skips both banning and picking -- its 3-problem pool is assigned
//     directly), so this component only ever renders with teamSize 2 or 3.
//   - The pick screen is dibs: each player picks exactly ONE of the teamSize
//     problems left, and no two teammates may pick the same one. A player on
//     the other team picking the same problem is unrelated -- each team picks
//     among the same shared problems independently.
//   - A player who hasn't picked when the pick window ends is auto-assigned
//     whichever problem(s) their team hasn't picked yet, in pool order.
// ============================================================================

// The pick screen should display the problems left after banning
//  - When teamSize problems are left, that many questions should be displayed
//  - Each question should display its topics, not its name
//  - (decide) numbering: continue the ban screen's original "Question N" position, or renumber 1..teamSize for the smaller list?

// A player should be able to pick a question to work on
//  - An unpicked question should display "Pick this question"
//  - Clicking "Pick this question" should ask to pick that question
//  - Before the player has picked, the status should say they have a pick to make

// A player cannot pick a question a teammate already picked
//  - A question a teammate picked should display "Picked by <teammate name>"
//  - A question a teammate picked should not display "Pick this question"
//  - The name of a Team 1 teammate who picked should use the primary colour
//  - The name of a Team 2 teammate who picked should use the secondary colour
//  - (decide) this screen only shows the signed-in player's OWN team's picks -- does a problem the other team already picked need any different treatment, given each team picks independently from the same shared pool?

// A player only gets one pick
//  - A question the signed-in player picked should display "Picked by you"
//  - Once the player has picked, no question should display "Pick this question"
//  - Once the player has picked, the status should say their pick is in

// The pick screen should show how many picks are in, like the ban screen's ban count
//  - It should display "X of teamSize picks made" for the player's own team
//  - It should display one pick marker per teammate

// The pick screen should show a timer like the ban screen
//  - The time left to pick should be displayed
//  - (decide) is the pick window also 30s, same as the ban window, or a different length? The spec only says "roughly similar"

// Questions selected should carry over into the game
//  - (decide) what does carrying over mean for the editor -- does a player's picked question become their default/first tab, or their only tab (with teammates' tabs reached only via the workspace switcher)? This decides what game.test.tsx / MatchEditor need to assert, so it needs resolving before those tests are written.
