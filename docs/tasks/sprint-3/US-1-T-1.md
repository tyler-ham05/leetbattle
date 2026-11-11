---
id: US-1-T-1
story: US-1
sprint: 3
assignee: Ashwin Vinod
estimate_hours: 1 - 2 
---

# Player Ready Status

## Description
Add a ready/unready toggle to the lobby UI and show each player's ready status next to their name in the team columns.

## Specs
- Each player in the lobby can set their own status to ready or not ready.
- A player can become ready only when all 6 lobby seats are occupied, all 6 players are connected, and each team has 3 players.
- A player can switch from ready to not ready before the match countdown finishes.
- The lobby UI shows each player's current ready status next to their name and updates when any player's status changes.
- When all six players are ready, LobbyService starts a five-second countdown and broadcasts the remaining time.
- If a player becomes not ready or disconnects before the countdown finishes, the countdown is cancelled.
- When the countdown finishes with all six players still ready and connected, LobbyService emits `lobby:ready-for-match` with the six-player roster.
- This task covers lobby readiness and its UI; creating or running the match is out of scope.

## Requirements
- Use the existing authenticated LobbyService Socket.IO connection and lobby state.
- Keep readiness scoped to the currently joined player
- Preserve existing lobby join, leave, team assignment, and reconnect behavior.
- Add frontend tests for ready/unready controls, and dispalyed player status. Mock lobby socket; frontend tests should not connect to backend services.

## Acceptance criteria
1. A connected lobby member can mark themselves ready when all six connected players occupy two full teams.
2. The player can toggle back to not ready before the countdown completes, and the updated status is visible to all lobby clients.
3. A player cannot ready up while the lobby is missing a player, a team is not full, or a player is disconnected
4. When all six players are ready, all lobby clients see the five-second countdown
5. If the countdown completes while all six players remain ready and connected,  lobby clients receive `lobby:ready-for-match` with the `main` lobby ID and six-player roster.
