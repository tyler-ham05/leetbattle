# US-4-T-6: Live score feed and per-question result breakdown

## The score bumps when it goes up (match top bar)
- A team's score should not bump when the page first shows it
- When Your team's score goes up, its number should bump (lb-score-bump)
- When Your team's score goes up, the Rival team's number should not bump
- When a score stays the same on a new game state, it should not bump
- The bump keyframes should start at scale 0.97
- The bump keyframes should only animate transform
- With reduced motion, the bump should be off

## A new solve shows one line under the top bar for 4 seconds
- Questions solved before the page loaded should show no line
- When Your team newly solves the second question, "Your team solved Q2" should be shown
- When the Rival team newly solves the first question, "Rival team solved Q1" should be shown
- A Your team line should be in the primary color
- A Rival team line should be in the secondary color
- The line should be announced politely (aria-live="polite")
- A newer solve should replace the older line, so only one line is shown
- The line should still be shown just before 4 seconds have passed
- The line should be gone once 4 seconds have passed
- Someone who is not a player should see "Team 2 solved Q3" when team b solves the third question
- With reduced motion, the line's entrance should be off
- During a match, the game page should show "Your team solved Q2" under the top bar when a new game state says the user's team solved the second question

## The result screen lists each question and who solved it
- The result screen should have one row per question in the pool
- A question's row should be named "Q1 Two Sum" (position and title from the task id)
- The breakdown's columns should be "Your team" then "Rival team"
- A question Your team solved should show "Solved" in Your team's column
- "Solved" in Your team's column should be in the primary color
- "Solved" in the Rival team's column should be in the secondary color
- A question a team did not solve should show "–" in that team's column
- "–" should be in muted text
- The breakdown should come in after the halves (lb-result-rise, delayed past the halves)
- Once the match has ended, the game page should list the match's questions on the result screen (all mocked, no backend)

## Result screen score count
- The final score should not pad its digits to equal widths (no gap after a narrow "1")
- Once the halves have fully risen in, the score should still be counting (well below the final score)
- Once the count is done, the score should show the final score
- A winner's crown should only drop once the count has landed

## Top bar score counts up
- When the page first shows a score, it should show the score straight away
- Just after a team's score goes up, the top bar should still be counting (below the new score)
- Just after a team's score goes up, the top bar should already be above the old score
- Once the count is done (0.6s), the top bar should show the new score
- With reduced motion, a new score should show straight away

## Solved first
- When your team solves a question the rival team hasn't solved, a "solved first" moment should show
- The moment should show the question as "Q<n>"
- The moment should say "Solved first"
- The moment should play the katana slice (a blade and the word cut into top and bottom halves), like the home loader
- Both halves of the cut should show the question
- The moment should still be showing just before the katana slice ends
- The moment should be gone once the katana slice ends (2.3 seconds)
- The moment should be hidden from screen readers (the feed line already announces the solve)
- When your team solves a question the rival team already solved, no moment should show
- When the rival team solves a question first, no moment should show
- Questions solved before the page loaded should show no moment
- With reduced motion, no moment should show
- The moment should use the loader layer that reduced motion hides
