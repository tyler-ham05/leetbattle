# Match screens polish: your team first everywhere, cleaner ban and pick, tidy copy (US-5-T-22)

## Lobby: your team on the left, in the primary color
- A seated player on team b should see "Your team" as the first team heading
- A seated player on team b should see "Your team" in the primary color
- A seated player on team b should see "Rival team" as the second team heading
- A seated player on team b should see "Rival team" in the secondary color
- A seated player on team b should see their own team's bar first
- A player on team b should see their own name in the first team's list
- Someone watching a lobby they have not joined should still see "Team 1" then "Team 2"

## Game page before play: same naming and order
- While banning, a player on team b should see "Your team" as the first roster heading
- While banning, a player on team b should see the "Your team" roster heading in the primary color
- While banning, a player on team b should see "Rival team" as the second roster heading
- While banning, a player on team b should see the "Rival team" roster heading in the secondary color
- While banning, a player on team b should see their own name in the "Your team players" list
- While waiting for players, the rosters should also be "Your team" then "Rival team"

## Pre-match header: no score, only the phase clock
- While waiting for players, the header should not show "0 – 0"
- While banning, the header should not show "0 – 0"
- While picking, the header should not show "0 – 0"
- While banning, the header should still show the ban clock

## Match clock turns red under one minute
- With 59 seconds left in the match, the clock should be in the danger color
- With 60 seconds left in the match, the clock should not be in the danger color

## Connected teammates next to Forfeit are plain muted text
- A connected teammate's name should not be a pill (no rounded-full)
- A connected teammate's name should have no border
- A connected teammate's name should be in the muted color

## Ban screen
- Viewed from team b, a team b player's "Banned by" name should be in the primary color
- Viewed from team b, a team a player's "Banned by" name should be in the secondary color
- The ban screen should not show the "Team 1" legend
- The ban screen should not show the "Team 2" legend
- The ban screen should show no progress pips
- The ban screen should show no rounded-full shapes (dots or pills)
- A topic on the ban screen should be a flat rounded-md label
- A banned question should have a line struck across its card
- An open question should have no strike line
- The strike line's keyframes should only animate transform
- The strike line should be turned off with reduced motion

## Pick screen
- The pick screen should show no progress pips
- The pick screen should show no rounded-full shapes (dots or pills)
- A topic on the pick screen should be a flat rounded-md label
- The pick screen intro should not contain "--"
- The pick screen intro should say "Pick one to work on. Your teammates can't pick the one you choose."
- Viewed from team b, a teammate's "Picked by" name should be in the primary color (your team is always primary)
- The viewer's own pick should still say "Picked by you"

## Copy
- Someone looking at a full lobby they have not joined should see "This lobby is full" with no period
- Someone who has not joined a lobby with room should see "You have not joined this lobby yet" with no period
- The game page should show no subtitle under the "Match" heading
- Saving a new name should show "Name updated" with no period
- Changing the password should show "Password changed" with no period
- A lowercase server error on saving the name should be shown starting with a capital letter
- A lowercase server error on changing the password should be shown starting with a capital letter
- The home menu's Lobby line should not say "six-player"

## Unused code is gone
- home-wheel.tsx should no longer exist
- home-menu.tsx should no longer exist
- globals.css should no longer define .lb-seat-pip
