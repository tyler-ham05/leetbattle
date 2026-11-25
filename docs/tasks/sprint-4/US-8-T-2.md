---
id: US-8-T-2
story: US-8
sprint: 4
assignee: tyler-ham05
estimate_hours: 3
---

# Assign individual questions from the pool instead of the whole pool to each player

## Description
Serves US-8 (Cohesive Gameplay #142). As implemented, all players are assigned the entire question pool, instead of assigning the questions they've picked. Each player should instead be working on different questions, so that each player can contribute to the team. The number of questions should be depenedent on the number of questions banned previously.

Out of scope:
- Updating the number of questions per team total (dependent on ban phase and previous)
- Any UI changes other then displaying the updated number of questions

## Specs
(service/GameService)
- The picked questions should be exclusively saved to each player
- If a user(s) does not pick questions, assign the remaining questions for each player sequentially
- The question limit per player should be # questions in pool / number of players
- Users should not be able to select more than the question limit
- Question limit does not need to be explicitly displayed
(frontend/app/game)
- The user should be able to see only their selected questions in their workspace
(frontend/app/game/pick-screen)
- The frontend should support deselecting questions, and  


## Requirements
- Changes should be isolated to service/GameService, frontend/game, and frontend/test
- Do not attempt to change logic that handles how many questions are fetched intitally from game initialization or after the ban phase
- The number of questions a player can pick should be enforced in the backend

## Acceptance criteria
1. A user should be able to select a maximum of ceil(# of questions / # of teammates) questions
2. A user that selects questions should be assigned those questions during gameplay
3. A user that does not have questions assigned to them should have questions assigned to them randomly
