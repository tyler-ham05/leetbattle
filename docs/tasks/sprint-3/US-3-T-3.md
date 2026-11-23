---
id: US-3-T-3
story: US-3
sprint: 3
assignee: Sree Satya Jayanth Gudapati
estimate_hours: 3
---

# Restore team chat history when a player joins or reconnects

## Description
Serves US-3-T-4. Today the chat panel only keeps messages it received while open. A player who joins late, reconnects, or refreshes sees an empty team chat. This task adds changes to make GameService keep each live game's team chat in memory and send it to a player when they connect. 

Out of scope: restoring chat if GameService restarts, history from other games, the other team's messages, paging or a "load more" button, and the chat safeguards in US-3-T-4.


## Specs
### GameService
- Each live game keeps every accepted team chat message in memory, per team, oldest first.
- When a player connects or reconnects, GameService sends them the chat history with every message their team has sent so far in this game.
- Each message in `chat:history` has the same shape as `chat:message` with the same id and sent time as the saved `team_messages` row.
- A team with no messages yet is sent an empty list.
- Messages from the other team/other games are never included.
- Rejected messages (too long  or rate limited) are never included.
- Messages are still saved to `team_messages` as in US-3-T-2.

### Frontend
- The game socket stores the latest `chat:history` it receives.
- The chat panel on the match page starts with those messages from history followed by any newer `chat:message` events.
- A message that arrives both in `chat:history` and as a live `chat:message` is shown once.
- When the player reconnects, the panel shows the new `chat:history`, without duplicating messages it already shows.
- With no history, the panel shows "No messages yet".
- Without a game socket (the practice editor), the panel works as before. (All tests from previous PRs should still pass)

### Files touched
- `service/GameService/src/service.ts`
- `service/GameService/src/server.ts`
- `frontend/app/game/socket-context.tsx`
- `frontend/app/game/[gameId]/page.tsx`
- `frontend/app/editor/chat-context.tsx`
- `service/GameService/test/chat.test.ts`
- `frontend/test/game-socket.test.tsx`
- `frontend/test/game.test.tsx`
- `frontend/test/chat.test.tsx`
- `service/GameService/test/chat-test-pseudo.md`
- `frontend/test/chat-test-pseudo.md`





## Requirements
- History comes from the gameservice memory, not from the database. 
- Team and game come from the authenticated socket, never from the client.
- No new libraries.
- Existing US-3-T-1, US-3-T-2 and US-3-T-4 tests keep passing.

## Acceptance criteria
1. A player who connects is sent `chat:history` with every earlier message from their team in this game, oldest first.
2. `chat:history` includes no message from the other team.
3. With two games running, `chat:history` includes no message from the other game.
4. A team with no messages is sent an empty chat history.
5. A rejected message (too long or rate limited) is not in chat history
6. The chat panel on the match page shows the team's earlier messages, oldest first.
7. A message received in both `chat:history` and a live `chat:message` is shown only once.
8. After reconnecting, the chat panel shows the team's earlier messages with no duplicates.
