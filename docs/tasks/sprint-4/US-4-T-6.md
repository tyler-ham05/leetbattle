---
id: US-4-T-6
story: US-4
sprint: 4
assignee: woozoo21
estimate_hours: 4
---

# Live score feed and per-question result breakdown

## Description
Serves US-4 (Team Score, #42). Scoring is visible as it happens: the score bumps when it changes, and a one-line note says which team solved which question. The result screen shows, question by question, which teams solved it.

## Specs
- `GameState` on the client includes `solved: Record<TeamId, string[]>` (task ids), which GameService already sends.
- Match top bar: when a team's score goes up, its number does a quick 0.97 → 1 bump (transform only, with a reduced-motion override).
- The top bar's score counts up from the old score to the new one over 0.6s (ease-out) as it bumps. On page load it shows the score as is; with reduced motion it just changes.
- When the player's team solves a question before the rival team has, "Q<n>" (primary) with "Solved first" under it plays the home loader's katana slice (2.3s): it shows whole, the blade streaks along the diagonal cut, then the halves glide apart as the cover fades. It doesn't block clicks, is hidden from screen readers (the feed line announces the solve), and doesn't play for the rival team, for questions the rival already solved, for solves from before the page loaded, or with reduced motion. The katana scene is shared from the page loader, not copied.
- When a team newly solves a question, a single line appears under the top bar for 4 seconds: "Your team solved Q2" or "Rival team solved Q2" (Q = the question's 1-based position in the pool), in that team's color. It is announced with `aria-live="polite"`, and newer lines replace older ones. Nothing shows for questions solved before the page loaded.
- Result screen: under the two halves, one row per question ("Q1 Two Sum") with "Your team" / "Rival team" columns showing "Solved" in the team's color or "–" in muted text. It comes in after the halves.
- Result screen scores: the count from 0 starts as the halves finish rising and runs about a second, so it can be seen. The crowns drop as it lands, and the digits aren't padded to equal widths, so there's no gap after a narrow "1".

## Requirements
- No new dependencies and no backend changes.
- Use only the theme classes defined in docs/frontend/theming.md. No dots or badges.
- Every new animation has a `prefers-reduced-motion: reduce` override.
- Frontend tests (`frontend/test/`) do not touch backend services.

## Acceptance criteria
1. A score change bumps the score.
2. A new solve shows "<Team> solved Q<n>" for 4 seconds.
3. The result screen lists every question and which teams solved it.
5. The top bar score counts up to the new score, and solving a question before the rival team plays the katana slice with "Q<n> / Solved first".
4. The result scores visibly count up from 0, and "150" has no gap after the 1.
