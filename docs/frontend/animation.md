### Animation

Every UI in the app follows these motion rules. The shared pieces live in the
MOTION section of `app/globals.css`; `test/motion-rules.test.tsx` checks them.

| Rule | How | Where it's used |
|------|-----|-----------------|
| **Entrances** start from `scale 0.97` + `opacity 0`, never from scale 0 | `.lb-enter` (keyframes `lb-enter`) | account menu, forfeit dialog, tooltips, lobby seats |
| **Buttons** press to 0.97 | `button:active:not(:disabled) { scale: 0.97 }` and `button { transition: scale 150ms ease-out }` (base layer) | every enabled button |
| **Wrong passwords** shake the field (translateX 0, -10, 10, -6, 6, -3, 0px over 360ms) and turn it red | `AuthField` props `invalid` (red, `aria-invalid`) and `shake` (bump it once per failed attempt) → `.lb-shake` | log in, settings "Current password" |
| **Steppers** slide the next step in from the direction you're going, no crossfade | `data-step="forward"` / `data-step="back"`; `AuthCard` takes `step={{ id, direction }}` | login → forgot password → check your email |
| **Accordions** animate `height: auto` | `:root { interpolate-size: allow-keywords }` + `.lb-fold` with `data-collapsed` | sign-up Name field |
| **Moving things** animate `transform`, never `top`/`left` | — | lobby team-size highlight, pen-tip lines |
| **Theme switches** turn transitions off while the theme changes | `.theme-switching * { transition: none !important }`, added by `saveTheme()` in `app/_shared/theme-state.ts` | settings scheme picker, top-bar light/dark button |
| **Tooltips** delay only the first one; once one is open, the rest show instantly | `app/_shared/tooltip.tsx` (500ms first delay, 300ms warm window) | theme swatches, top-bar light/dark button |
| **Match result** (end of a match): Victory! slams in oversized in the middle of the screen and the page jolts once; Defeat sinks in with no bounce. The word then slides up, the two team halves rise in, the scores count up from 0, crowns drop onto the winners one by one, then the buttons | `.lb-result-slam` / `.lb-result-sink` (word), `.lb-result-jolt` (page), `.lb-result-rise` and `.lb-result-crown` (staggered with `--d`); scores use `useCountUp` in `app/_shared/use-count-up.ts` (final number at once with reduced motion) | `app/game/components/result-screen.tsx` |
| **Busy states**: anything that waits on a server shows a spinning ring (`Spinner`, 0.7s per turn). In a button the label swaps for the spinner, the button keeps its width and full color (`aria-busy:opacity-100`) and keeps its name for screen readers (`aria-label`); a button that can't be used meanwhile greys out. Loading text gets the spinner beside it | `app/_shared/spinner.tsx` (`.lb-spin`; slower under reduced motion) | every `AuthSubmitButton` (log in, sign up, reset link, new password, settings), "Loading question...", "Joining match…" |
| **Run / Submit**: while busy the word becomes "Running" / "Judging" and breathes, and a light runs around the button's edge (no spinner); the button keeps its size, color and name. The result lands on the button for 1.5s: a pass ("Passed", "Accepted") nods twice with a check mark, a fail ("2 failed", "Wrong", "Error") turns red and shakes like a wrong password. Only while a result shows does the button grow to fit it (a width transition, the one exception to transform-only movement) | `.lb-trace` (the button sets `--lb-fill` and `--lb-glint`), `.lb-breath`, `.lb-nod`, `.lb-shake`; reduced motion keeps a still edge and drops the breath and nod | `editor/components/submit-bar.tsx` |
| **Ladder team size**: the faint giant size behind the controls (e.g. "2v2") blurs out as the size changes while the new one sharpens in, its digits sliding out of the "v" to the sides. A horizontal fade keeps the middle faint, dithered with fine noise so it doesn't band | `.lb-lad-zone` (mask), `.lb-lad-giant` with `data-on`; the dropdown value rolls with `.lb-lad-roll` (`data-at`); reduced motion only fades | `app/ladder/page.tsx` |
| **Ladder queue**: on PLAY the background dims and the two team columns glide in from the edges toward the rank card, growing as they come (rivals a beat later). Open seats read "Searching" with dots counting up; a seat filling pops in. The WAITING box has a light running around its edge, even on the straights and easing a little at the corners | `.lb-lad-dim`, `.lb-lad-side` (`data-side`, `data-shown`), `.lb-lad-searching`, `.lb-lad-filled`, `.lb-trace.lb-lad-trace` (keyframes `lb-lad-orbit`, walked along the box's border); "MATCH FOUND" nods with `.lb-nod`; reduced motion only fades | `app/ladder/page.tsx` |
| **Match start**: once a match is found, the two teams' names fill the screen in two rows that sweep in from opposite sides and drift, separated by thin bars and sized so the longest row fits. A VS spins in once, is sliced on a steep diagonal by a blade and its halves part, then the screen fades into the game | `.lb-ms` (`--lb-ms-em`, the widest row in em), `.lb-ms-row`, `.lb-ms-mine` / `.lb-ms-rivals`, `.lb-ms-vs`, `.lb-ms-spin`, `.lb-ms-whole` / `.lb-ms-half`, `.lb-ms-cut`, `.lb-ms-blade`; reduced motion shows the names and a still VS that fade out | `app/ladder/match-start.tsx` |
| **Flicks and drags**: on release, hand off to a spring that keeps the release velocity (e.g. `animate(y, 0, { type: "spring", duration: 0.5, bounce: 0, velocity })`), not a fixed-duration transition | — | nothing draggable yet |
| **Carousels**: past either end, add resistance that grows the further you pull, then spring back | — | no carousel in use yet |

Notes:

- A button with its own `transition-*` utility replaces the base `scale`
  transition, so add `scale 150ms ease-out` back to it
  (e.g. `[transition:color_300ms_ease,scale_150ms_ease-out]`).
- Use the `--lb-*` theme colors for anything animated (see `theming.md`).
- Every new animation needs a `prefers-reduced-motion: reduce` override at
  the bottom of `globals.css`.
- Browsers without `interpolate-size` (Firefox, older Safari) snap accordions
  open instead of animating; that's acceptable.
