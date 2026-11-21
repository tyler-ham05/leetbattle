# Sprint 4 polish: busy spinners, your team / rival team, match starts after the clash

## Anything slow shows a spinner (loading style 2: the label swaps for a spinner, the button keeps its width)
- While Run is running, the Run button should be marked busy
- While Run is running, the Run button should show a spinner
- While Run is running, the Run button should still be named "Run" for screen readers
- While Run is running, the Run button should not show the word "Run"
- While Submit is submitting, the Submit button should be marked busy
- While Submit is submitting, the Submit button should show a spinner
- While Submit is submitting, the Submit button should not show the word "Submit"
- While Submit is submitting, the Run button should not be marked busy
- While nothing is running, the Submit button should show the word "Submit"
- While nothing is running, no spinner should be shown
- A form button (log in, sign up, reset link, new password, settings) that is pending should be marked busy
- A pending form button should show a spinner
- A pending form button should be named by its pending label ("Logging in") for screen readers
- A pending form button should not show any words
- A form button that is not pending should show its label
- While a question is loading, the question panel should show a spinner
- While the game page is joining the match, it should show a spinner

## Your team / rival team (your team is always the accent color)
- In the match top bar, the user's team should be called "Your team"
- In the match top bar, the other team should be called "Rival team"
- In the match top bar, a user on team b should see their own score first, in the primary color
- The result screen should label the user's half "Your team"
- The result screen should label the other half "Rival team"
- The result screen should put the user's half first even when they are on team b
- The result screen should color "Your team" with the primary color even when they are on team b
- When the user's team wins, the result screen should say "Your team wins"
- When the other team wins, the result screen should say "Rival team wins"
- Someone who is not a player should still see "Team 1 wins"
- In the lobby, once seated, the user's team heading should be "Your team"
- In the lobby, once seated, the other team's heading should be "Rival team"
- In the lobby, an open seat on the other team should be a "Switch to rival team" button
- In the lobby, a user with no team should still see "Join Team 1"
- The team clash should label its left side "YOUR TEAM"
- The team clash should label its right side "RIVAL TEAM"

## The match starts right after the clash
- The game page should play no loader while banning
- The game page should play no loader while picking
- The game page should play no loader once the match is playing

## The pen-tip wipe does not cut off the last letter
- The wordmark wipe (shared by the sub page loader and the landing intro) should end past the wordmark's right edge
- The wordmark wipe should end past the wordmark's top and bottom, so no letter's top or tail is shaved
