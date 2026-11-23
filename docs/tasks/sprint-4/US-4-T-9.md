---
id: US-4-T-9
story: US-4
sprint: 4
assignee: woozoo21
estimate_hours: 5
---

# Lobby: slide to ready, one-step join, seats that stay put

## Description
Serves US-4 (Polished Match Experience, sprint 4). Readying up becomes a slider, joining takes one click on a seat, and the teams stay on their own sides so switching teams (and back) is obvious. A two-finger trackpad swipe no longer takes players back a page.

## Specs
- **Slide to ready:** the Ready up button becomes a track with an arrow handle.
  - Sliding it to the end readies the player straight away, without waiting for a release. Sliding it back to the start unreadies them. Letting go partway snaps back.
  - It works by mouse or touch drag, by a two-finger trackpad swipe over it (following the fingers with natural scrolling), and by keyboard (Space / Enter toggle, Right / Left arrows).
  - It has `role="slider"` with its value and "Ready" / "Not ready" text.
  - Until every seat is taken it is greyed out and reads "Waiting for players".
- **No swipe back:** the lobby page sets `overscroll-behavior-x: none`, and swipes over the slider are swallowed, so a sideways swipe never navigates back.
- **One-step join:** before joining, every open seat shows "Join here" (always visible, not only on hover). Clicking one joins the lobby and takes that seat. The big button becomes "Quick join", which joins and takes a seat on the emptier team (Team 1 on a tie). The headline reads "Pick a seat to join".
- **Seats stay put:** in the lobby, Team 1 is always left and Team 2 always right. A seated player's team is still called "Your team" in the primary color (bar, heading, ready tint), on whichever side it is. Your row slides across VS when you switch.
- **Visible switching:** once seated, the other team's open seats always show "Switch here". Your own team's open seats show "Open seat".
- Reduced motion turns off every new animation.

## Requirements
- No new dependencies and no LobbyService changes (`lobby:join`, then `lobby:join-team`).
- Use only the theme classes defined in docs/frontend/theming.md. No decorative dots.
- Frontend tests (`frontend/test/`) do not touch backend services.

## Acceptance criteria
1. Sliding to the end readies the player, sliding back unreadies them, and keyboard works too.
2. A two-finger sideways swipe over the slider moves it and never goes back a page.
3. Clicking an open seat before joining joins and takes that seat. Quick join seats the player on the emptier team.
4. Switching teams moves your row to the other side, and you can switch back from the other team's open seat.
5. The slider is disabled until every seat is taken.
