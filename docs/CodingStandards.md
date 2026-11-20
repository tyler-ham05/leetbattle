# Coding Standards

These standards apply to the frontend and every service. Code must meet them before a task counts as done, based on our definition of done.

## Linting

Each package has its own `eslint.config.mjs`, built from three shared rule sets:

- **`eslint.configs.recommended`**: ESLint's core checks for likely bugs.
- **`tseslint.configs.strict`**: typescript-eslint's stricter correctness rules, such as banning non-null assertions and flagging dynamic `delete`. This set doesn't need type information.
- **`tseslint.configs.stylistic`**: consistency rules for TypeScript, such as preferring `interface` and `T[]` array syntax.

On top of those, every package enforces:

| Rule | Setting |
|---|---|
| Indentation | Tabs |
| Semicolons | Always |
| Quotes | Single |
| Trailing commas | On multi-line lists |
| Equality | `===` / `!==` only (`eqeqeq`) |
| Variables | `const` where possible, never `var` |
| Unused variables | Error, except arguments starting with `_` |

Run `npm run lint` in the package, or `npx eslint --fix` to fix what can be fixed automatically. Lint rules must not be changed.

## Duplicate detection

- jscpd checks each package's source folder (`src` for services, `app` for the frontend).
- Duplicated code must stay at or below **5% per package**.
- Run `npm run cpd` in the package. The HTML report is written to `cpd/`.

## Unit testing

- Vitest enforces an **80% global coverage threshold** in each package, for lines, statements, functions and branches.
- Run `npm test` in the package. The run fails if coverage drops below 80%.
- Tests follow the TDD workflow in `AGENTS.md`: a person writes pseudocode tests first, they are converted into tests that fail, and only then is the code written. Each test has exactly one `expect`.
