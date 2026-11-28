## US-6-T-2: GameService socket should require authentication
- Connections without a valid login token should be rejected with "unauthorized"
- A logged-in user who is not a player in the game should be rejected with "not-in-game"
- A connection for a gameId that does not exist should be rejected with "not-in-game"

## GameService socket should send the game state to a player who joins
- The "game:state" event should carry the gameId the player connected to
- The game state should list all six players
- The game state should list the nine problems in the match pool
- The joining player should be shown as connected
- The game state should include how many seconds remain in the match

## GameService socket should put each player in their team's room
- A player on team a should be in the "game:<gameId>:a" room
- A player on team a should not be in the "game:<gameId>:b" room

## GameService socket should keep every player's connection status up to date
- When a second player joins, players already connected should receive a game state showing two connected players
- When a player's socket drops, the remaining players should receive a game state showing that player as disconnected

## Game should wait for its players before the clock starts
- A new game should be waiting for players
- When every player has connected, the game should start playing
- When the join wait runs out, the game should start with whoever has connected

## Game should give a dropped player time to reconnect
- Right after a player's socket drops, they should not be marked as left
- When a player reconnects within the window, they should not be marked as left
- When the window runs out, the player should be marked as left
- When every player on a team has left, the other team should win by disconnect

## Players should be able to forfeit as a team
- When one of two connected teammates forfeits, the game should keep going with one forfeit vote counted
- The same player forfeiting twice should count once
- When every connected teammate has forfeited, the other team should win by forfeit

## Game should shut down cleanly once it ends
- Once the game ends, the players' sockets should be closed
- Once the game ends, connecting to it should be rejected with "not-in-game"
- Once the game ends, the players should no longer have an active game

## GameService socket should send enough about each problem for the game page to load it
- Each problem in the match pool should carry its task_id
- Each problem in the match pool should carry the question_id CodeService looks problems up by
- Each problem in the match pool should carry its difficulty

## Players should be able to submit a solution through the game
- A correct solution should come back from CodeService as "Accepted"
- The code should be graded by CodeService using the problem's question_id
- Once a solution is accepted, the game state should show that problem as solved for the submitter's team
- A wrong solution should not mark the problem as solved
- A problem that isn't in the match pool should be rejected with "unknown-problem"
- Submitting before the game has started should be rejected with "not-playing"
- When CodeService fails, the submission should be rejected with "grading-failed"

## Teams should not be able to spam submissions
- While a teammate's submission is being graded, another submission from the same team should be rejected with "team-busy"
- While one team's submission is being graded, the other team should still be able to submit
- Right after a team's submission is graded, its next submission should be rejected with "cooldown"
- Once the cooldown has passed, the team should be able to submit again

## Game should end once a team solves every problem
- When a team has solved every problem in the pool, that team should win with reason "solved"

## Game should decide the winner when time runs out
- When team a has the higher score, team a should win
- When team b has the higher score, team b should win
- When the scores are level, the game should be a draw

## Game should still finish when saving its end fails
- When the database can't save the end of the game, the players should still receive the result

### US-6-9

## Game should hold a ban phase before the clock starts
- When every player has connected, the game should move to "banning"
- When the join wait runs out, the game should move to "banning" with whoever has connected
- While banning, the game state should show the full 20 minutes remaining
- While banning, the game state should include how many seconds are left to ban

## GameService socket should send each problem's topics for the ban screen
- Each problem in the match pool should carry its tags from CodeService as topics

## Players should be able to ban one problem each
- When a player bans a problem, the game state should show that problem as banned by that player
- The ban should carry the banning player's display name
- The ban should carry the banning player's team
- When a player bans, the other players should receive a game state showing the ban
- A player's second ban should be rejected with "already-banned"
- Banning a problem another player already banned should be rejected with "problem-banned"
- Banning a problem that isn't in the match pool should be rejected with "unknown-problem"
- Banning once play has started should be rejected with "not-banning"
- Submitting a solution during the ban phase should be rejected with "not-playing"

## Play should start once the bans are in
- When every player has banned, the game should start playing
- Once play starts, the match pool should only list the problems that weren't banned
- In a 3v3, six bans should leave three problems in play
- In a 1v1, two bans should leave seven problems in play
- When the ban window runs out, the game should start playing with the bans made so far
- When a player has left during the ban phase, the game should start once every remaining player has banned

## Game should give a player who drops during the ban phase time to reconnect
- When a player's socket drops during the ban phase, their reconnect window should start
- When every player on a team has left during the ban phase, the other team should win by disconnect

## Game should be won on the problems left in play
- When a team has solved every problem left after the bans, that team should win with reason "solved"

> **(decide)** Bans should be saved
> - Once play starts, the game's saved problems (game_problems) should only be the ones left in play

### US-2-T-2 (#48): Players' code should reach only their own team
- When a player sends their code, a teammate should receive it with the player's userId
- The teammate should receive the question id and the workspace that was sent
- A player on the other team should never receive it
- The player who sent it should not receive it back
- Code sent before play has started should not be relayed
- Code for a question that isn't in the match pool should not be relayed
- A malformed workspace should not be relayed

---

> **DRAFT (Claude, for review):** US-6-T-7, GameService should keep a readable reference of every player's code. Edit / cut / reword before tests are written.

## GameService should save a reference to each player's shared code
- After a player sends "game:code", the game state should hold that player's workspace for that question
- Sending "game:code" again for the same question should replace the saved workspace, not add to it
- A player's workspace for a different question should be saved separately, so both remain readable
- A malformed workspace should not be saved
- Code sent before play has started should not be saved
- Code for a question that isn't in the match pool should not be saved

## GameService should hand a joining or reconnecting player their teammates' saved code
- On connecting mid-match, a player should receive a "game:code:snapshot" of every teammate's saved workspaces
- The snapshot should be keyed by teammate userId and questionId
- The snapshot should never include the connecting player's own saved workspace
- The snapshot should never include a player from the other team
- A teammate who hasn't shared any code yet should not appear in the snapshot
- Once the game ends, saved workspaces should be discarded with the rest of the game state

---

> **DRAFT (Claude, for review):** US-6-T-8, scoring submissions by percent of testcases passed. Edit / cut / reword before tests are written.
>
> Points by difficulty: Easy 150, Medium 300, Hard 450. A problem's points are `floor(testCasesPassed / testCasesTotal * pointsForItsDifficulty)`. Resubmitting is allowed; per the earlier decision, only the best score a team has reached on a problem counts toward the team's total.

## Points should be awarded by the percent of testcases passed
- An Easy problem passing all of its cases should award 150 points
- A Medium problem passing 2 of its 3 cases should award 200 points (floor(2/3 * 300))
- A Hard problem passing 1 of its 4 cases should award 112 points (floor(1/4 * 450))
- A problem passing none of its cases should award 0 points

## Submitting should update the team's score
- A scored submission should add its points to the submitting player's team score
- The updated score should be sent to the whole game room on the next "game:state"
- Running code (not submitting) should never change the team's score

## A team should only be credited its best score on each problem
- Resubmitting a problem for fewer points than an earlier submission should not lower the team's score
- Resubmitting a problem for more points than an earlier submission should raise the team's score by only the difference
- Resubmitting a problem for the same points as an earlier submission should not change the team's score again

## Scored submissions should be saved
- A scored submission should insert a row into `submissions` with the player's userId, the task_id, the testcases passed and total, and the points it was awarded

> *(unchanged by this task, already covered above: "Game should decide the winner when time runs out" compares game.scores.a/b, which this task makes real; "Game should end once a team solves every problem" still means every case passed, not total points, and is untouched)*

---

> **DRAFT (Claude, for review):** US-6-T-10, pool size by team size, a 1v1 skipping banning and picking, and a pick phase after banning. Edit / cut / reword before tests are written.
>
> **NOTE:** this changes REAL, already-passing tests, not just earlier pseudocode:
> - Every ban-phase test above (and in socket.test.ts) assumes a fixed nine-problem pool (6 Easy + 3 Medium) for every team size. Under this draft the pool becomes 2\*teamSize Easy + 1\*teamSize Medium (9 for 3v3, 6 for 2v2), so those tests' numbers need updating.
> - The 1v1 case of "Play should start once the bans are in" ("In a 1v1, two bans should leave seven problems in play") and the matching real test in socket.test.ts ("pool is the seven problems the 1v1's two bans left") go away entirely: a 1v1 no longer bans or picks at all.
>
> Rules this draft assumes:
> - teamSize = players.length / 2. Pool = 2\*teamSize Easy + 1\*teamSize Medium questions (9/6/3 for 3v3/2v2/1v1).
> - A 1v1 (teamSize 1) skips both "banning" and "picking": it goes straight from "waiting" to "playing" on its full 3-problem pool.
> - For teamSize 2 or 3, banning works as today (one ban per player), which always leaves exactly teamSize problems, shared by both teams. Picking follows: each player picks exactly one of those teamSize problems, and no two teammates may pick the same one (teams don't interact with each other's picks).
> - A 30s pick window, same length as banning -- (decide) confirm.
> - A player who hasn't picked when the pick window ends is auto-assigned whichever problem(s) their team hasn't picked yet, in pool order.

## Pool size should scale with team size
- A 3v3 (6 players) should get a pool of 6 Easy + 3 Medium problems
- A 2v2 (4 players) should get a pool of 4 Easy + 2 Medium problems
- A 1v1 (2 players) should get a pool of 2 Easy + 1 Medium problems

## A 1v1 should skip banning and picking entirely
- A 1v1 should move straight from "waiting" to "playing" once both players have connected
- A 1v1's match pool should be all 3 of its problems, unbanned and unpicked
- A 1v1 should never show a "banning" or "picking" phase, even briefly

## Game should hold a pick phase after the bans, before the clock starts (teamSize 2 or 3 only)
- When every player has banned, the game should move to "picking" instead of "playing"
- While picking, the game state should show the full 20 minutes remaining
- While picking, the game state should include how many seconds are left to pick

## Players should be able to pick one problem each
- When a player picks a problem, the game state should show that problem as picked by that player
- The pick should carry the picking player's display name and team
- When a player picks, their teammates should receive a game state showing the pick
- A player's second pick should be rejected with "already-picked"
- Picking a problem a teammate already picked should be rejected with "problem-picked"
- Picking a problem that isn't in the match pool should be rejected with "unknown-problem"
- Picking once play has started should be rejected with "not-picking"
- A player may pick a problem a player on the OTHER team has picked (picks are per team, not match-wide)

## Play should start once every player has picked
- When every player has picked, the game should start playing
- When the pick window runs out, the game should start playing, with whoever hasn't picked auto-assigned the problem(s) their team hasn't picked, in pool order
- When a player has left during the pick phase, the game should start once every remaining player has picked

## Game should give a player who drops during the pick phase time to reconnect
- When a player's socket drops during the pick phase, their reconnect window should start
- When every player on a team has left during the pick phase, the other team should win by disconnect

> **(decide)** Does "Questions selected should carry over into the game" (the acceptance criteria) mean anything for GameService's state beyond the pick itself (e.g. a pickedBy-style field surviving into the playing phase for the frontend to read), or is the pick only ever used to decide the auto-assignment and otherwise forgotten once play starts?

## US-8-2, GameService should now assign the picked questions to users
- Questions that users pick should be assigned directly to the user
- Users should be able to select up to CEIL(# of questions / # of players) questions
- Users that do not select questions should have questions assigned to them sequentially
- No two teammates should have the same questions
- A user should be able to deselect (give back) a question they picked, freeing it for a teammate and for their own next pick
- The 
// US-6-T-2: GameService socket should require authentication
 //  - Connections without a valid login token should be rejected with "unauthorized"
 //  - A logged-in user who is not a player in the game should be rejected with "not-in-game"
 //  - A connection for a gameId that does not exist should be rejected with "not-in-game"

 // GameService socket should send the game state to a player who joins
 //  - The "game:state" event should carry the gameId the player connected to
 //  - The game state should list all six players
 //  - The game state should list the nine problems in the match pool
 //  - The joining player should be shown as connected
 //  - The game state should include how many seconds remain in the match

 // GameService socket should put each player in their team's room
 //  - A player on team a should be in the "game:<gameId>:a" room
 //  - A player on team a should not be in the "game:<gameId>:b" room

 // GameService socket should keep every player's connection status up to date
 //  - When a second player joins, players already connected should receive a game state showing two connected players
 //  - When a player's socket drops, the remaining players should receive a game state showing that player as disconnected

 // Game should wait for its players before the clock starts
 //  - A new game should be waiting for players
 //  - When every player has connected, the game should start playing
 //  - When the join wait runs out, the game should start with whoever has connected

 // Game should give a dropped player time to reconnect
 //  - Right after a player's socket drops, they should not be marked as left
 //  - When a player reconnects within the window, they should not be marked as left
 //  - When the window runs out, the player should be marked as left
 //  - When every player on a team has left, the other team should win by disconnect

 // Players should be able to forfeit as a team
 //  - When one of two connected teammates forfeits, the game should keep going with one forfeit vote counted
 //  - The same player forfeiting twice should count once
 //  - When every connected teammate has forfeited, the other team should win by forfeit

 // Game should shut down cleanly once it ends
 //  - Once the game ends, the players' sockets should be closed
 //  - Once the game ends, connecting to it should be rejected with "not-in-game"
 //  - Once the game ends, the players should no longer have an active game

 // GameService socket should send enough about each problem for the game page to load it
 //  - Each problem in the match pool should carry its task_id
 //  - Each problem in the match pool should carry the question_id CodeService looks problems up by
 //  - Each problem in the match pool should carry its difficulty

 // Players should be able to submit a solution through the game
 //  - A correct solution should come back from CodeService as "Accepted"
 //  - The code should be graded by CodeService using the problem's question_id
 //  - Once a solution is accepted, the game state should show that problem as solved for the submitter's team
 //  - A wrong solution should not mark the problem as solved
 //  - A problem that isn't in the match pool should be rejected with "unknown-problem"
 //  - Submitting before the game has started should be rejected with "not-playing"
 //  - When CodeService fails, the submission should be rejected with "grading-failed"

 // Teams should not be able to spam submissions
 //  - While a teammate's submission is being graded, another submission from the same team should be rejected with "team-busy"
 //  - While one team's submission is being graded, the other team should still be able to submit
 //  - Right after a team's submission is graded, its next submission should be rejected with "cooldown"
 //  - Once the cooldown has passed, the team should be able to submit again

 // Game should end once a team solves every problem
 //  - When a team has solved every problem in the pool, that team should win with reason "solved"

 // Game should decide the winner when time runs out
 //  - When team a has the higher score, team a should win
 //  - When team b has the higher score, team b should win
 //  - When the scores are level, the game should be a draw

 // Game should still finish when saving its end fails
 //  - When the database can't save the end of the game, the players should still receive the result

// ============================================================================
// DRAFT (Claude, for review): ban phase. Edit / cut / reword before tests are written.
// Rules agreed: every player bans one of the nine, the rest are played; a 30s
// ban window, and anyone who hasn't banned when it runs out is skipped.
// NOTE: this changes two existing tests above in "Game should wait for its players":
//   "When every player has connected, the game should start playing"
//   "When the join wait runs out, the game should start with whoever has connected"
//   -> both should now move the game to "banning" instead (see first group below).
// ============================================================================

 // Game should hold a ban phase before the clock starts
 //  - When every player has connected, the game should move to "banning"
 //  - When the join wait runs out, the game should move to "banning" with whoever has connected
 //  - While banning, the game state should show the full 20 minutes remaining
 //  - While banning, the game state should include how many seconds are left to ban

 // GameService socket should send each problem's topics for the ban screen
 //  - Each problem in the match pool should carry its tags from CodeService as topics

 // Players should be able to ban one problem each
 //  - When a player bans a problem, the game state should show that problem as banned by that player
 //  - The ban should carry the banning player's display name
 //  - The ban should carry the banning player's team
 //  - When a player bans, the other players should receive a game state showing the ban
 //  - A player's second ban should be rejected with "already-banned"
 //  - Banning a problem another player already banned should be rejected with "problem-banned"
 //  - Banning a problem that isn't in the match pool should be rejected with "unknown-problem"
 //  - Banning once play has started should be rejected with "not-banning"
 //  - Submitting a solution during the ban phase should be rejected with "not-playing"

 // Play should start once the bans are in
 //  - When every player has banned, the game should start playing
 //  - Once play starts, the match pool should only list the problems that weren't banned
 //  - In a 3v3, six bans should leave three problems in play
 //  - In a 1v1, two bans should leave seven problems in play
 //  - When the ban window runs out, the game should start playing with the bans made so far
 //  - When a player has left during the ban phase, the game should start once every remaining player has banned

 // Game should give a player who drops during the ban phase time to reconnect
 //  - When a player's socket drops during the ban phase, their reconnect window should start
 //  - When every player on a team has left during the ban phase, the other team should win by disconnect

 // Game should be won on the problems left in play
 //  - When a team has solved every problem left after the bans, that team should win with reason "solved"

 // (decide) Bans should be saved
 //  - Once play starts, the game's saved problems (game_problems) should only be the ones left in play

// US-2-T-2 (#48): Players' code should reach only their own team
 //  - When a player sends their code, a teammate should receive it with the player's userId
 //  - The teammate should receive the question id and the workspace that was sent
 //  - A player on the other team should never receive it
 //  - The player who sent it should not receive it back
 //  - Code sent before play has started should not be relayed
 //  - Code for a question that isn't in the match pool should not be relayed
 //  - A malformed workspace should not be relayed

// ============================================================================
// DRAFT (Claude, for review): US-6-T-7, GameService should keep a readable
// reference of every player's code. Edit / cut / reword before tests are
// written.
// ============================================================================

 // GameService should save a reference to each player's shared code
 //  - After a player sends "game:code", the game state should hold that player's workspace for that question
 //  - Sending "game:code" again for the same question should replace the saved workspace, not add to it
 //  - A player's workspace for a different question should be saved separately, so both remain readable
 //  - A malformed workspace should not be saved
 //  - Code sent before play has started should not be saved
 //  - Code for a question that isn't in the match pool should not be saved

 // GameService should hand a joining or reconnecting player their teammates' saved code
 //  - On connecting mid-match, a player should receive a "game:code:snapshot" of every teammate's saved workspaces
 //  - The snapshot should be keyed by teammate userId and questionId
 //  - The snapshot should never include the connecting player's own saved workspace
 //  - The snapshot should never include a player from the other team
 //  - A teammate who hasn't shared any code yet should not appear in the snapshot
 //  - Once the game ends, saved workspaces should be discarded with the rest of the game state

// ============================================================================
// DRAFT (Claude, for review): US-6-T-8, scoring submissions by percent of
// testcases passed. Edit / cut / reword before tests are written.
// Points by difficulty: Easy 150, Medium 300, Hard 450. A problem's points are
// floor(testCasesPassed / testCasesTotal * pointsForItsDifficulty).
// Resubmitting is allowed; per the earlier decision, only the best score a
// team has reached on a problem counts toward the team's total.
// ============================================================================

 // Points should be awarded by the percent of testcases passed
 //  - An Easy problem passing all of its cases should award 150 points
 //  - A Medium problem passing 2 of its 3 cases should award 200 points (floor(2/3 * 300))
 //  - A Hard problem passing 1 of its 4 cases should award 112 points (floor(1/4 * 450))
 //  - A problem passing none of its cases should award 0 points

 // Submitting should update the team's score
 //  - A scored submission should add its points to the submitting player's team score
 //  - The updated score should be sent to the whole game room on the next "game:state"
 //  - Running code (not submitting) should never change the team's score

 // A team should only be credited its best score on each problem
 //  - Resubmitting a problem for fewer points than an earlier submission should not lower the team's score
 //  - Resubmitting a problem for more points than an earlier submission should raise the team's score by only the difference
 //  - Resubmitting a problem for the same points as an earlier submission should not change the team's score again

 // Scored submissions should be saved
 //  - A scored submission should insert a row into `submissions` with the player's userId, the task_id, the testcases passed and total, and the points it was awarded

 // (unchanged by this task, already covered above: "Game should decide the winner
 // when time runs out" compares game.scores.a/b, which this task makes real; "Game
 // should end once a team solves every problem" still means every case passed,
 // not total points, and is untouched)

// ============================================================================
// DRAFT (Claude, for review): US-6-T-10, pool size by team size, a 1v1
// skipping banning and picking, and a pick phase after banning. Edit / cut /
// reword before tests are written.
//
// NOTE: this changes REAL, already-passing tests, not just earlier
// pseudocode:
//   - Every ban-phase test above (and in socket.test.ts) assumes a fixed
//     nine-problem pool (6 Easy + 3 Medium) for every team size. Under this
//     draft the pool becomes 2*teamSize Easy + 1*teamSize Medium (9 for 3v3,
//     6 for 2v2), so those tests' numbers need updating.
//   - The 1v1 case of "Play should start once the bans are in" ("In a 1v1,
//     two bans should leave seven problems in play") and the matching real
//     test in socket.test.ts ("pool is the seven problems the 1v1's two bans
//     left") go away entirely: a 1v1 no longer bans or picks at all.
//
// Rules this draft assumes:
//   - teamSize = players.length / 2. Pool = 2*teamSize Easy + 1*teamSize
//     Medium questions (9/6/3 for 3v3/2v2/1v1).
//   - A 1v1 (teamSize 1) skips both "banning" and "picking": it goes
//     straight from "waiting" to "playing" on its full 3-problem pool.
//   - For teamSize 2 or 3, banning works as today (one ban per player),
//     which always leaves exactly teamSize problems, shared by both teams.
//     Picking follows: each player picks exactly one of those teamSize
//     problems, and no two teammates may pick the same one (teams don't
//     interact with each other's picks).
//   - A 30s pick window, same length as banning -- (decide) confirm.
//   - A player who hasn't picked when the pick window ends is auto-assigned
//     whichever problem(s) their team hasn't picked yet, in pool order.
// ============================================================================

 // Pool size should scale with team size
 //  - A 3v3 (6 players) should get a pool of 6 Easy + 3 Medium problems
 //  - A 2v2 (4 players) should get a pool of 4 Easy + 2 Medium problems
 //  - A 1v1 (2 players) should get a pool of 2 Easy + 1 Medium problems

 // A 1v1 should skip banning and picking entirely
 //  - A 1v1 should move straight from "waiting" to "playing" once both players have connected
 //  - A 1v1's match pool should be all 3 of its problems, unbanned and unpicked
 //  - A 1v1 should never show a "banning" or "picking" phase, even briefly

 // Game should hold a pick phase after the bans, before the clock starts (teamSize 2 or 3 only)
 //  - When every player has banned, the game should move to "picking" instead of "playing"
 //  - While picking, the game state should show the full 20 minutes remaining
 //  - While picking, the game state should include how many seconds are left to pick

 // Players should be able to pick one problem each
 //  - When a player picks a problem, the game state should show that problem as picked by that player
 //  - The pick should carry the picking player's display name and team
 //  - When a player picks, their teammates should receive a game state showing the pick
 //  - A player's second pick should be rejected with "already-picked"
 //  - Picking a problem a teammate already picked should be rejected with "problem-picked"
 //  - Picking a problem that isn't in the match pool should be rejected with "unknown-problem"
 //  - Picking once play has started should be rejected with "not-picking"
 //  - A player may pick a problem a player on the OTHER team has picked (picks are per team, not match-wide)

 // Play should start once every player has picked
 //  - When every player has picked, the game should start playing
 //  - When the pick window runs out, the game should start playing, with whoever hasn't picked auto-assigned the problem(s) their team hasn't picked, in pool order
 //  - When a player has left during the pick phase, the game should start once every remaining player has picked

 // Game should give a player who drops during the pick phase time to reconnect
 //  - When a player's socket drops during the pick phase, their reconnect window should start
 //  - When every player on a team has left during the pick phase, the other team should win by disconnect

 // (decide) does "Questions selected should carry over into the game" (the
 // acceptance criteria) mean anything for GameService's state beyond the pick
 // itself (e.g. a pickedBy-style field surviving into the playing phase for
 // the frontend to read), or is the pick only ever used to decide the
 // auto-assignment and otherwise forgotten once play starts?

// ============================================================================
// US-8-T-1 (#183): the ban phase becomes a team vote, so the cases above that
// assume one ban per player change. The vote itself is specified in
// ban-vote-pseudo.md; these are the existing cases whose numbers or meaning
// move, which is why they stay here rather than there.
//
// What changes:
//   - The pool grows by one question per ban, so it is 3 questions per player
//     plus 2: 11 for a 3v3, 8 for a 2v2, 5 for a 1v1, a third of them Medium.
//     Every "pool size" and "nine problems" case above takes the new numbers.
//   - "Players should be able to ban one problem each" goes: a click is a vote
//     now, and nothing is banned until the window closes. Only the cases about
//     how the ban phase sits in the match stay (a vote for a question outside
//     the pool, a vote once play has started, a submission during the bans).
//   - "Play should start once the bans are in" becomes picking after the bans,
//     and the two cases about ending the phase early (every player has banned,
//     or every remaining player once someone left) go: the window always runs
//     in full.
//   - A 1v1 bans now, since its pool of 5 has to lose both bans to reach 3. It
//     still skips picking.
// ============================================================================

 // Pool size should scale with team size, with room for both bans
 //  - A 3v3 (6 players) should get a pool of 8 Easy + 3 Medium problems
 //  - A 2v2 (4 players) should get a pool of 6 Easy + 2 Medium problems
 //  - A 1v1 (2 players) should get a pool of 4 Easy + 1 Medium problems
 //  - A 3v3's match pool should list all eleven problems

 // A 1v1 should ban, then skip picking
 //  - A 1v1 should move to "banning" once both players have connected
 //  - A 1v1 should move to "banning" with whoever has connected when the join wait runs out
 //  - A 1v1's match pool should be all 5 of its problems while it votes
 //  - A 1v1 should play the 3 problems its bans leave
 //  - A 1v1 should never show a "picking" phase, even briefly

 // The ban phase should sit in the match as before
 //  - A vote for a problem that isn't in the match pool should be rejected with "unknown-problem"
 //  - A vote once play has started should be rejected with "not-banning"
 //  - Submitting a solution during the ban phase should be rejected with "not-playing"

 // Picking should start once the bans are in
 //  - Once the window has closed and the bans have been shown, the game should move to "picking"
 //  - Once picking starts, the match pool should only list the problems that weren't banned
 //  - A 3v3's two bans should leave nine problems to play
 //  - A 2v2's two bans should leave six problems to play
 //  - Picking should start even when nobody voted
 //  - Once play starts, the saved pool (game_problems) should be only the problems left in play
