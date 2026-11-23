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
4. The result scores visibly count up from 0, and "150" has no gap after the 1.
