### Theming

The whole site shares one light/dark + color-scheme system, driven by two
attributes on `<html>`:

- `data-scheme` — one of `emerald` (default), `volt`, `midnight`, `ultraviolet`
- `data-mode` — `dark` (default) or `light`

Users change these from the settings page (`app/settings/components/form.tsx`),
via `app/_shared/theme-controls.tsx`. The choice is saved to `localStorage` and
re-applied before first paint by the init script in `app/theme.ts`, so there's
no flash of the wrong theme.

All the actual colors live in `app/globals.css` as CSS variables, one block per
`[data-scheme][data-mode]` combination (e.g. `[data-scheme="volt"][data-mode="light"]`).
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
