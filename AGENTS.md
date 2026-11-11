# Architecture
@leetbattle/docs 
Frontend Structure: docs/frontend/frontend.md
Frontend theming: docs/frontend/theming.md
Backend Service: docs/service/services.md
s


# Stack:
- Node.js 20 (node:20-alpine)
- PostgreSQL 18 (postgres:18-alpine)
- Next.js 16.4.2
- React / React DOM 19.3.0
- @monaco-editor/react 4.7.0 (monaco-editor 0.57.0)
- Tailwind CSS 4.3.3
- TypeScript 5.9.3
- Express 4.22.3
- pg 8.23.1
- jose 6.2.14
- bcryptjs 2.4.3
- cors 2.8.6
- dotenv 16.6.1
- eslint 10.13.0 (services), 8.57.1 (frontend) — lint only
- vitest 5.0.5 — tests only
- supertest 7.3.1 — tests only
- ts-node-dev 2.0.0 — local dev reload only
- jscpd 5.4.2 — duplicate-code check only
- concurrently ^9.1.0 — runs all services together, root-level, version not pinned (no root lockfile)

# Ask a person before:
- Modifying **anything** related to GCP, including running 'gcloud' commands or deploying anything
- Touching git at all (including: push, pull, PR, commit)
- Editing anything under leetbattle/docs






# TDD is mandatory
Every change should follow **failing test first -> implement -> verify**. A person **must** write the tests. Frontend tests must not touch backend services. Every test should only have one expect statement.
1. The tests will be written in pseudocode under the following directories respectively
  -frontend/test
  -service/AuthService/test
  -service/CodeService/test
2. Convert the user written pseudocode into thoroughly commented tests that capture the desired behaviour and watch them **fail**.
3. Implement the **minumum** code to make them pass.

Never write implementation before a corresponding failing test exists. When addressing bugs, reproduce it with a failing test first. 

# Commands
Run these from the project root unless instructed otherwise

- Install dependancies for all components: `npm run install`
- Start the test PostgressSQL server, frontend, and services: `npm run start`
  - The Docker daemon must be running
  - Run this command in the background
- Run tests: `<coming soon>`

Run this command individually for frontend and service
- Auto-fix lint errors: `npx eslint --fix`




# Invariants
## Codebase Invariants
1. Do not change linting rules
2. Adhere to the rules stated by copy_paste_function



