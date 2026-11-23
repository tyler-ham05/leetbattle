# Lobby: slide to ready, one-step join, seats that stay put (US-4-T-9)

## Slide to ready
- Once every seat is taken, the lobby should show a slider named "Slide to ready"
- The slider should have role "slider"
- A player who is not ready should hear the slider's value as "Not ready"
- A ready player should hear the slider's value as "Ready"
- A ready player's slider should be at 100
- Dragging the handle to the end should send a ready event straight away, before letting go
- Dragging the handle back to the start should send a not-ready event for a ready player
- Letting go partway should snap the handle back to the start
- Letting go partway should not send a ready event
- A plain click on the slider should not send a ready event
- Pressing Space should toggle the player to ready
- Pressing Enter on a ready player should toggle them to not ready
- Pressing Right arrow should ready the player
- Pressing Left arrow on a ready player should unready them
- Until every seat is taken the slider should be marked disabled
- Until every seat is taken the slider should read "Waiting for players"
- Until every seat is taken, dragging to the end should not send a ready event

## Two-finger swipe over the slider
- A sideways swipe over the slider should be swallowed, so the browser never goes back
- A swipe of the fingers to the right (natural scrolling) should ready the player
- A mostly vertical swipe should not move the slider
- A short swipe should snap back to the start once the fingers stop for a moment
- The lobby should set overscroll-behavior-x to none while it is shown

## One-step join
- Before joining, the headline should read "Pick a seat to join"
- Before joining, an open seat should always show "Join here" (not only on hover)
- Clicking an open Team 2 seat before joining should send a join event
- Once the join lands, the page should take that seat by sending join-team "b"
- The big button should be "Quick join"
- Quick join should send a join event
- Once the quick join lands, the page should take a seat on the emptier team
- Quick join on a tie should take a seat on Team 1

## Seats stay put
- A user on Team 2 should still see Team 2 on the right, so "Your team" is the second heading
- A user on Team 2 should see "Your team" in the primary color
- A user on Team 2 should see "Rival team" in the secondary color
- A user on Team 2 should see Team 2's bar in the primary color
- Once seated, the other team's open seat should always show "Switch here"
- Once seated, the user's own team's open seat should show "Open seat" and no "Switch here"
- After switching teams, the user's row should enter from the other side
