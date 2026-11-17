---
id: US-6-T-4
story: US-6
sprint: 3
assignee: Sashreek Rewatkar
estimate_hours: 4 - 5
---

# Question bans before each match

## Description
Serves US-6 (In-Game, #67). Before the match clock starts, every player bans one of the match's nine questions, and the match is played on the ones left. Replaces the ban screen's sample questions with the real ban phase in GameService. Issue #95.

## Specs
- GameService has a `banning` phase between `waiting` and `playing`. A game moves to it once every player has connected, or when the join wait runs out.
- The 20-minute match clock does not run during the ban phase.
- Every player bans one question. The match is played on the rest: a 3v3 plays 3, a 2v2 plays 5 and a 1v1 plays 7.
- The ban window is 30 seconds. When it runs out, play starts with the bans made so far, and anyone who hasn't banned is skipped.
- Play starts as soon as every player still in the game has banned. A player who has left (missed the reconnect window) doesn't hold up the bans.
- The reconnect window runs during the ban phase, and a whole team leaving during it loses by disconnect.
- A player bans with the `game:ban { questionId }` socket event. GameService answers `{ ok: true }`, or refuses with `not-banning`, `unknown-problem`, `already-banned` or `problem-banned`.
- `game:state` gives each problem its topics (CodeService's tags) and who banned it, plus the seconds left to ban.
- Once play starts, the pool only has the unbanned questions, so a team wins by solving those. The banned questions are removed from `game_problems`.
- The game page shows the ban screen while the game is banning, with the questions by topic only, who banned what, the bans made, and a "Bans close in" countdown. It shows the match once play starts.

## Requirements
- The ban phase lives in `service/GameService/src/server.ts`, and the game state and its wire form in `service/GameService/src/service.ts`.
- The ban screen is `frontend/app/game/components/ban-screen.tsx`, rendered from `frontend/app/game/[gameId]/page.tsx`. `frontend/app/game/socket-context.tsx` sends `game:ban`.
- The standalone `/ban` page and its sample questions are removed.
- Use only the theme classes defined in docs/frontend/theming.md. No new dependencies.
- GameService tests (`service/GameService/test/socket.test.ts`) fake CodeService. Frontend tests (`frontend/test/ban.test.tsx`, `game.test.tsx`, `game-socket.test.tsx`) mock the game socket and do not touch backend services.
- Starting a match locally needs 6 Easy and 3 Medium questions in CodeService, so load the full set with `service/CodeService/setup/dataset.py`.

## Acceptance criteria
1. Once every player has connected, or the join wait runs out, the game shows the ban screen instead of starting the clock.
2. Each player can ban one question, and every player sees the ban live with the banning player's name.
3. A second ban, a question already banned, a question not in the pool, or a ban after play has started is refused.
4. Play starts once every player still in the game has banned, or when the 30-second window runs out.
5. The match is played on the unbanned questions only, and solving all of them wins.
6. A whole team leaving during the ban phase loses by disconnect.
