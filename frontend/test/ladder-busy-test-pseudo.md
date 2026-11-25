# Ladder arena cards and Run/Submit busy feedback (US-10-T-9)

## Ladder: heading
- When not queued, the page heading should read "Ladder"
- When not queued, the line under the heading should read "Queue for a 1v1, 2v2 or 3v3 match"
- While queued, the page heading should read "Finding players"

## Ladder: arena cards
- There should be a section named "1v1 queue", one named "2v2 queue" and one named "3v3 queue"
- The 3v3 card should show 6 seat bars
- With 2 players waiting for 3v3, 2 of its seat bars should be filled
- With 2 players waiting for 3v3, its card should say "2 of 6 players"
- Each card should have a "Join <mode>" button
- Clicking "Join 2v2" should send queue:join "2v2"
- While not connected, the join buttons should be disabled

## Ladder: queued
- A player queued for 2v2 should see the 2v2 card marked as queued (data-state "queued")
- A player queued for 2v2 should see the other two cards marked as dimmed (data-state "dim")
- A player queued for 2v2 should see a timer reading "0:00" on the 2v2 card
- After 7 seconds queued, the timer should read "0:07"
- A player queued for 2v2 should see "Leave queue" on the 2v2 card
- Clicking "Leave queue" should send queue:leave
- A player queued for 1v1 should still be able to click "Join 3v3", which sends queue:join "3v3"
- A player who is not queued should see no "Leave queue" button

## Ladder: match found
- Once a match is found, the page should show "Match found"
- Once a match is found, the countdown should show 2
- One second later, the countdown should show 1
- Before the countdown ends, the page should not go to the game
- When the countdown ends, the page should go to /game/<gameId>
- Once a match is found, the chosen card should be marked found (data-state "found")
- Once a match is found, the other cards should be marked leaving (data-state "leaving")
- Once a match is found, the other cards should be hidden from screen readers
- Once a 2v2 match is found, the chosen card should show "Your team" and "Rival team"
- Once a 1v1 match is found, the chosen card should show "You" and "Rival"
- Once a 2v2 match is found, its first 2 seat bars should be in the Your team color and the last 2 in the Rival team color
- Once a match is found, the join buttons should be disabled
- Once a match is found, there should be no "Leave queue" button

## Ladder: errors (unchanged)
- A QueueService error should still be shown in an alert
- With no error, there should be no alert

## Run and Submit: busy
- While running, Run should show the word "Running"
- While running, Run should still be named "Run"
- While running, Run should be marked busy (aria-busy)
- While running, Run should have the edge light (class lb-trace)
- While running, Run should show no spinner
- While submitting, Submit should show the word "Judging"
- While submitting, Submit should still be named "Submit"
- While submitting, Submit should have the edge light
- While submitting, Submit should show no spinner
- While submitting, Run should be disabled

## Run and Submit: the result lands on the button
- After a Submit that comes back Accepted, Submit should show "Accepted"
- After a Submit that comes back Accepted, Submit should nod (class lb-nod)
- After a Submit that comes back Accepted, Submit should show a check mark
- After a Submit that comes back Wrong Answer, Submit should show "Wrong"
- After a Submit that comes back Wrong Answer, Submit should shake (class lb-shake)
- After a Submit that comes back Runtime Error, Submit should show "Error"
- After a Run where every case is Accepted, Run should show "Passed"
- After a Run where 2 cases fail, Run should show "2 failed"
- After a Run where 2 cases fail, Run should shake
- While a result is shown, the button should be marked as showing a result (data-result "pass" or "fail")
- 1.5 seconds after the result, Submit should show "Submit" again
- 1.5 seconds after the result, Submit should no longer be marked as showing a result
- Clicking Run while Submit is still showing "Accepted" should start the run straight away
- When the submit request itself fails, Submit should go straight back to "Submit" with no nod or shake

## Motion rules (globals.css)
- lb-trace should have a reduced-motion override
- lb-nod should have a reduced-motion override
- lb-shake on the buttons should use the same keyframes as the wrong-password shake
- The ladder card reveal (leaving and found) should have a reduced-motion override
- The countdown digit should have a reduced-motion override

## Existing tests this task changes
- busy-indicators.test.tsx "shows a spinner in Run while running" becomes "shows Running in Run while running"
- busy-indicators.test.tsx "shows a spinner in Submit while submitting" becomes "shows Judging in Submit while submitting"
- busy-indicators.test.tsx "does not show the word Run while running" now means not the bare word "Run" (it shows "Running")
- busy-indicators.test.tsx "does not show the word Submit while submitting" now means not the bare word "Submit" (it shows "Judging")
- editor.test.tsx (US-4-T-2) "shows Accepted between the editor and the Case tabs" looks for "Accepted" inside the Submission result panel, since the Submit button also says "Accepted" for a moment
- ladder.test.tsx (US-9-T-2) "shows how many players are waiting in each queue" now expects "N of M players" instead of "N waiting"
- ladder.test.tsx (US-9-T-2) "shows the player waiting for a match in the queue they joined" now expects the "Finding players" heading and the card's queued state instead of "Waiting for a 2v2 match"
- ladder.test.tsx (US-9-T-2) "takes the player to the new game once a match is found" now goes after the 2-1 countdown
