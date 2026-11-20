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
| **Theme switches** turn transitions off while the theme changes | `.theme-switching * { transition: none !important }`, added by `save()` in `app/_shared/theme-controls.tsx` | settings scheme/mode controls |
| **Tooltips** delay only the first one; once one is open, the rest show instantly | `app/_shared/tooltip.tsx` (500ms first delay, 300ms warm window) | theme swatches, light/dark toggle |
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
