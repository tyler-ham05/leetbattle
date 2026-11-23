# US-6-T-13: Teammate presence in the workspace switcher

## The game socket remembers which question each teammate last edited
- Before any teammate edits anything, no teammate should have a question
- After a teammate's `game:code` for question 2, that teammate's question should be 2
- After a teammate's `game:code` for question 2 and then for question 3, that teammate's question should be 3
- A `game:code` from one teammate should not change another teammate's question
- A `game:code:snapshot` should give each teammate the question of their latest entry in it
- Connecting to a new match should forget every teammate's question

## The workspace switcher shows each teammate's question
- A teammate who last edited question 2 (the second in the pool) should show "Q2" after their name
- The "Q2" should be in muted text (text-muted)
- A teammate who has not edited anything should show only their name
- The number should be the question's position in the pool, not its question id (question id 7 second in the pool shows "Q2")
- The "You" tab should never show a question
- A disconnected teammate who edited question 2 should still show the disconnected icon
- A disconnected teammate's tab should still be faded

## Opening a teammate's workspace opens it on their question
- On the game page, a teammate who edited question 1 and then question 2 should show "Q2" on their tab
- On the game page, a teammate who has not edited anything should show no question on their tab
- On the game page, opening the teammate who edited question 1 and then question 2 should show question 2

(socket.io-client and CodeService's fetch are faked; no test touches a backend service)
