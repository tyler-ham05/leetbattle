### Theming

The whole site shares one light/dark + color-scheme system, driven by two
attributes on `<html>`:

- `data-scheme` — one of `emerald` (default), `midnight`, `nocturne`, `shoreline`,
  `merlot`, `coffee`, `performative`, `lilac`, `tidepool`, `sugarplum`, `vim`
- `data-mode` — `dark` (default) or `light`

Users switch light/dark with the sun/moon button in the top bar of every page
(`app/_shared/theme-toggle.tsx`: in `HomeTopBar`, on the signed-in home screen
and in the landing page's nav). They pick a scheme on the settings page
(`app/settings/components/form.tsx`) via `app/_shared/theme-controls.tsx`
("Try it on": hovering a scheme name shows it in a live match preview, clicking
uses it). Both read and write `<html>` through `app/_shared/theme-state.ts`
(`useHtmlAttribute`, `saveTheme`). The choice is saved to
`localStorage` and re-applied before first paint by the init script in
`app/theme.ts`, so there's no flash of the wrong theme. A saved scheme that no
longer exists falls back to the default. Switching turns transitions off for one
frame (`.theme-switching`), so colors swap at once instead of fading.

All the actual colors live in `app/globals.css` as CSS variables, one block per
`[data-scheme][data-mode]` combination (e.g. `[data-scheme="coffee"][data-mode="light"]`).
The selectors aren't tied to `<html>`: any element carrying both attributes
gets that scheme's colors inside it. The settings preview and the favicon use
this to show a scheme without changing the page.
Each block defines the same set of `--lb-*` variables, which Tailwind exposes as
utility classes via `@theme inline`:

| Utility class(es)                  | Variable          | Use for |
|-------------------------------------|--------------------|---------|
| `bg-page`                          | `--lb-page`        | the page background |
| `bg-surface`                        | `--lb-surface`     | cards, modals, inputs |
| `bg-raised`                         | `--lb-raised`      | hovered/active rows, pressed buttons |
| `border-line`                       | `--lb-line`        | borders, dividers |
| `text-ink`                          | `--lb-ink`         | primary text |
| `text-muted`                        | `--lb-muted`       | secondary/helper text |
| `bg-primary`, `text-on-primary`     | `--lb-primary`, `--lb-on-primary` | primary buttons/links, brand accents |
| `text-secondary`                    | `--lb-secondary`   | secondary accents |
| `text-danger`                       | `--lb-danger`      | error text/states |

**Rule: never use raw Tailwind palette classes** (`zinc-*`, `gray-*`, `neutral-*`,
`slate-*`, `bg-white`, `bg-black`, `text-white`, `text-black`, etc.) for anything
that should look like part of the app. They're fixed colors — they don't move
when the user changes scheme or mode, which is how pages used to end up
inconsistent with each other (dark gray boxes on a light page, etc).

If you need a color this table doesn't cover, add a new `--lb-*` variable to
every scheme/mode block in `globals.css` and expose it under `@theme inline`,
rather than reaching for a literal Tailwind color.

**`dark:` variants:** Tailwind's `dark:` prefix is repointed (via
`@custom-variant dark` at the top of `globals.css`) to key off `data-mode`
instead of the OS's `prefers-color-scheme`. So `dark:` still works and will
track the in-app toggle — but prefer the semantic classes above when the color
should also shift with the color scheme (not just light/dark). Reach for
`dark:` only for things with no theme token, like the Easy/Medium/Hard
difficulty colors in `editor/components/question-panel.tsx`, which are
intentionally fixed hues (green/yellow/red) across every scheme.

**Team colors:** players see their own team first as **Your team** in
`--lb-primary`, and the other as **Rival team** in `--lb-secondary`, whichever
lobby side they were on: the match top bar (`ScoreLine`), the result screen
and the lobby's Leet vs Battle clash. In the lobby the sides stay put (team a
left in `--lb-primary`, team b right in `--lb-secondary`), but once seated the
headings read Your team / Rival team. Anyone not on a team (an onlooker, or
before joining) sees Team 1 / Team 2. `app/_shared/teams.ts` (`teamsFor`) gives
the names, order and colors; use it instead of hard-coding team names. The newer schemes are calm on
purpose: low-saturation accents, tinted near-black pages (no pure black) and
off-white text in dark mode, and a Team 2 from the same color family as Team 1,
set apart mostly by depth. Every text color passes WCAG AA (4.5:1) on the page
and raised backgrounds, except Vim, whose colors match the Vim start screen
exactly (pure black page, its Team 2 blue is 3.4:1). Merlot and Sugarplum show
errors in amber so they don't blend into their own team colors.

**Adding a scheme:** add it to `SCHEMES` in `app/theme.ts` (the order is the
order settings shows), and add a dark and a light block to `globals.css` with
every `--lb-*` variable.

**Favicon:** `app/_shared/favicon.ts` draws the tab icon (`</>` with a katana
through it): the brackets in the scheme's two team colors, a white blade, the
handle in `--lb-muted`, on a tile in `--lb-page`. `app/_shared/theme-favicon.tsx`
redraws it whenever the scheme changes, always from the scheme's dark colors so
the white blade stays visible. `app/icon.svg` is the Emerald dark version that
shows before any script runs; a test keeps it in sync with `faviconSvg`.

**No dots.** Don't use dots (`●`, `•`, `◦` or small `rounded-full` circles) as
decoration: no colored dots before team names, no dot legends, no progress-pip
rows, no status dots. They make the UI look AI-generated. Show the same thing
with words in the team's color, a plain count ("2 of 4 bans"), or a thin bar.
Topics and tags are plain text, not pills.
