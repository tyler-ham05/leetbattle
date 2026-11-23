---
id: US-4-T-7
story: US-4
sprint: 4
assignee: woozoo21
estimate_hours: 2
---

# Bug: the last solved question's points are missing from the final score

## Description
Serves US-4 (Team Score, #42). When a team solves the last question in the pool, the match ends, but the result screen shows the score and the solved questions from before that last solve. Example: a team solves Q1, Q2 and Q3 and wins with reason "solved", but the result screen shows 300 instead of the full score, and Q3 as unsolved. Every player sees the wrong final score.

Cause: in GameService's `game:submit` handler, solving the whole pool calls `endGame` and returns before `broadcastState`, so the final `game:state` (with the last question's points and its entry in `solved`) is never sent. `game:ended` only carries the winner and reason, so clients keep the state from before the last solve. The saved score in the database is correct.

## Specs
- Before `game:ended` goes out, every player receives a final `game:state` with the final scores and solved lists, whatever ended the game (solved, forfeit, disconnect or time).
- That final state still has `phase: 'playing'` (or whatever phase the game was in). Clients never get a phase they don't know about.
- The result screen then shows the full score and every solved question.

## Requirements
- No new dependencies.
- The bug is reproduced with a failing GameService test first (`service/GameService/test/`), one expect per test.

## Acceptance criteria
1. Solving the last question sends a `game:state` with that question's points in the team's score before `game:ended`.
2. That state lists the last question as solved for the team.
3. The result screen after a full solve shows the full score and every question as Solved.
