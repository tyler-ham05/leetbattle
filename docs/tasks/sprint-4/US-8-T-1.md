---
id: US-8-T-1
story: US-8
sprint: 4
assignee: Sree-Gudapati
estimate_hours: 5
---

# Rework the ban system to be a team vote

## Description
Serves US-8 Cohesive Gameplay. Each player votes for one question. Each team bans the one its own members voted for most, instead of every player's click banning a question outright. A 3v3 fetches 11 questions, votes two off, and plays the 9 that are left, instead of the 3 it plays now. The two extra questions are Easy, so the Medium share of the pool does not change.Out of scope changes are assigning 3 questions per player after the ban (task 2). Additional game modes. Auth, code and lobby are untouched. 


## Files touched
Frontend

  - Modified: frontend/app/game/[gameId]/page.tsx
  - Mo dified: frontend/app/game/components/ban-screen.tsx
  - Modified: frontend/app/game/socket-context.tsx
  - Modified: frontend/test/ban-test-pseudo.md
  - Added: frontend/test/ban-vote-pseudo.md
  - Added: frontend/test/ban-vote.test.tsx
  - Deleted: frontend/test/ban.test.tsx
  -  Modified: frontend/test/game.test.tsx
  - Modified: frontend/test/match-screens-polish.test.tsx
  - Modified: frontend/test/practice-match-layout.test.tsx

  GameService
  - Modified: service/GameService/src/server.ts
  - Modified: service/GameService/src/service.ts
  - Added: service/GameService/test/ban-vote-pseudo.md
  - Added: service/GameService/test/ban-vote.test.ts
  - Modified: service/GameService/test/service.test.ts
  - Modified: service/GameService/test/setup.ts
  - Modified: service/GameService/test/socket-test-pseudo.md
  - Modified: service/GameService/test/socket.test.ts


## Specs

### Match format
- GameService keeps the whole match format in one place and derives every other count from it. 3 questions per player. 1 ban per team. A third of the pool rounded down as number of medium qs. A 30 second ban window. A 3 second reveal.
- The pool is what the match plays plus one question per ban the bans per team times the two teams. That is 11 in a 3v3, 8 in a 2v2 and 5 in a 1v1.
- The rest of the pool is Easy, so a 3v3 fetches 3 Medium and 8 Easy. A 2v2 fetches 2 and 6. A 1v1 fetches 1 and 4.

### Voting
- `game:ban` records a vote and removes nothing from the pool.
- A player can change their vote until the window closes. Clicking a second question moves their vote onto it.
- Two players can vote for the same question.
- A vote is refused when the match is not in the ban phase, when the question is not in the pool, or when the player's reconnect window has run out.
- A player whose reconnect window runs out keeps the vote they already cast. It still counts for their team, and they still count towards how many of the team have voted.
- The ban phase always runs its full window.
- Votes stay inside a team. Each team's copy of the match state carries only that team's votes, on the questions those votes are for, and goes to the `game:<gameId>:a` and `game:<gameId>:b` team rooms.

### Resolving the bans
The server runs this once, when the window closes. A client can never remove a question. There is one round per ban a team gets, so a single round at the current one ban per team.

1. Take the two teams in a random order, drawn again for each round.
2. For the team whose turn it is, tally that team's own votes over the questions still unbanned.
3. The candidates are the questions tied at that team's highest count. If the team has no usable votes, every unbanned question is a candidate.
4. Ban one candidate at random.

### Showing the result
- Every banned question moves out of the pool into a separate banned list. Each entry records the question and the team that banned it, never who voted.
- The ban screen stays up for the reveal, showing every banned question struck through and labelled with the team that banned it.
- The list is discarded once the match moves on.
- Every banned question is deleted from the match's saved pool, so what is stored matches what is played. DO NOT DELETE FROM THE MAIN DATABASE.

### Phases
- Every match starts with banning, a 1v1 included, since its pool of 5 has to lose both bans to reach 3.

### Ban screen
- Each question shows which teammates have voted for it, live, and never the other team's votes.
- The header shows how many of the player's own team have voted, and how long the window has left.

## Requirements
- The vote counting happens only in GameService. The client sends votes and renders state.
- A later game mode must be able to change the questions per player, the bans per team, the two windows and the difficulty mix in that one place. No count is written as a literal elsewhere, and no arithmetic is repeated.
- The frontend takes every count from the match state the server sends, never from the player count or the pool's length.
- Use only the theme classes defined in docs/frontend/theming.md.
- Frontend tests (`frontend/test/`) do not touch backend services.
- The pick phase still hands each player one question. Three questions each, and whether a 1v1 picks, are US-8-T-2.

## Acceptance criteria
1. A player can vote for one question, and change that vote until the ban window closes.
2. A player sees their teammates' votes live, and never the other team's.
3. Each team bans its share of the questions, each one the question with the most votes from that team when it is banned.
4. A tie, a team that did not vote, and both teams choosing the same question all settle the same way. Take the candidates from step 3, then select a random one of them.
5. After bans the pool has 9 questions for a 3v3, 6 for a 2v2 and 3 for a 1v1.
6. A client cannot ban a question directly.
7. Every player sees every banned question and which team banned it.
