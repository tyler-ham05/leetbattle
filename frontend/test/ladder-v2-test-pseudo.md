# Ladder launcher and match-start screen (US-10-T-10)

## Ladder: before queueing
- The page heading should read "Ladder"
- The Team size dropdown should show 2v2 to start
- Opening Team size should offer 1v1, 2v2 and 3v3
- Picking 3v3 should make the Team size dropdown show 3v3
- The Gamemode dropdown should show Classic
- Opening Gamemode should offer only Classic
- There should be a section named "Rank"
- There should be one button named "PLAY"
- While not connected, PLAY should be disabled
- There should be no YOUR TEAM column
- There should be no RIVALS column
- There should be no "Leave" button

## Ladder: queueing
- Clicking PLAY should send queue:join "2v2"
- After picking 3v3, clicking PLAY should send queue:join "3v3"
- A queued player should see "WAITING" instead of PLAY
- A queued player should see a timer reading "0:00"
- After 7 seconds queued, the timer should read "0:07"
- A queued player should see a "Leave" button
- Clicking Leave should send queue:leave
- While queued, the Team size dropdown should be disabled
- While queued, the Gamemode dropdown should be disabled
- With 3 players waiting in 2v2, a queued player should see "3" in queue

## Ladder: team columns
- A player queued for 2v2 should see a YOUR TEAM column
- A player queued for 2v2 should see a RIVALS column
- A player queued for 2v2 should see 2 seats under YOUR TEAM
- A player queued for 3v3 should see 3 seats under RIVALS
- With 1 player waiting in 2v2 (just them), 1 of the 4 seats should be filled
- With 3 players waiting in 2v2, 3 of the 4 seats should be filled
- With 3 players waiting in 2v2, YOUR TEAM should read "2 / 2"
- With 3 players waiting in 2v2, RIVALS should read "1 / 2"
- The player's own seat should show their name (no initials: there are no player icons yet)
- A filled seat that isn't the player's should read "Player found" while queued (names arrive with the match)
- An open seat should read "Searching"
- Once a match is found, the rival seats should show the rivals' names

## Match-start screen
- Once a match is found, the button should read "MATCH FOUND"
- Once a match is found, the match-start screen should show
- The match-start screen should show each name in yourTeam
- The match-start screen should show each name in rivals
- The player's own name should carry a "YOU" tag
- Names should be separated by a thin bar, not a dot
- With no names sent, the rows should read "YOUR TEAM" and "RIVALS"
- With three long names, the rows should be sized so the longest row fits (the font size uses the longest row)
- Before the screen ends, the page should not go to the game
- When the screen ends, the page should go to /game/<gameId>

## Ladder: errors (unchanged)
- A QueueService error should still be shown in an alert
- With no error, there should be no alert

## Motion rules (globals.css)
- The team columns sliding in should have a reduced-motion override
- The background team size should have a reduced-motion override
- The match-start rows sweeping should have a reduced-motion override
- The VS spin should have a reduced-motion override
- The VS blade should be hidden under reduced motion
- Under reduced motion, only the whole VS shows (no halves)

## Existing tests this task changes
- ladder-arena.test.tsx (US-10-T-9, ours) is deleted: every test in it checks the arena cards, which are gone. The sections above replace it.
- ladder-busy-motion.test.tsx (US-10-T-9, ours) loses its two Ladder card tests (.lb-card-leaving, .lb-card-found), since those classes are removed. Its lb-trace, lb-nod, lb-shake and lb-digit tests stay (the lobby still uses lb-digit).
- ladder-busy-test-pseudo.md (US-10-T-9) drops its Ladder sections and keeps the Run and Submit ones.
- ladder.test.tsx (US-9-T-2, Joshua):
  - "shows how many players are waiting in each queue" now checks the queued player's "IN QUEUE" count, since there's no per-queue count
  - "sends queue:join with %s when its join button is clicked" now picks the size in Team size, then clicks PLAY
  - "lets a player waiting in 1v1 join the 3v3 queue instead" is removed: you leave, then pick another size
  - "disables the join buttons while QueueService is not connected" now checks that PLAY is disabled
  - "shows a Leave queue button while the player is waiting" and "sends queue:leave when Leave queue is clicked" now look for "Leave"
  - "shows the player waiting for a match in the queue they joined" now checks for WAITING and the team columns instead of "Finding players"
  - "takes the player to the new game once a match is found" now goes after the match-start screen, not the 2-1 countdown
- ladder-socket.test.tsx (US-9-T-2) should still pass: the names are optional extras on queue:matched. It gets one new test: the names in queue:matched reach the page.
- lobby-arena.test.tsx (US5-Task20): the two "outlines an open seat ... in the muted color" tests now check the lighter raised fill instead, plus one new test that an open seat has no dashed outline (no dotted lines anywhere). "shows \"You\" in the user's own row" now checks the row has no "You" tag
- ladder-menu.test.tsx, home.test.tsx and match-screens-polish.test.tsx are unchanged.
