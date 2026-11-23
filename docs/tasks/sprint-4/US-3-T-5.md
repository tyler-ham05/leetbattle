---
id: US-3-T-5
story: US-3
sprint: 4
assignee: woozoo21
estimate_hours: 2
---

# Team chat: follow new messages, mark your own

## Description
Serves US-3 (Communication, #41). The match chat keeps the newest message in view, and a player can tell their own messages from their teammates'.

## Specs
- When a message arrives (live or from history) and the player is already at or near the bottom of the list (within 48px), the list scrolls to the newest message.
- If the player has scrolled up to read, a new message doesn't move the list. A flat "New messages" button in the existing button style appears at the bottom, and clicking it jumps down.
- The player's own messages show "You" instead of their name, in `text-ink`. Teammates' names stay `text-primary`. No bubbles and no alignment change.
- Sending a message always scrolls to the bottom.

## Requirements
- No new dependencies.
- Use only the theme classes defined in docs/frontend/theming.md.
- Frontend tests (`frontend/test/`) do not touch backend services.

## Acceptance criteria
1. A new message at the bottom of the list scrolls into view.
2. A player scrolled up isn't moved, and sees "New messages".
3. The player's own messages are labeled "You".
