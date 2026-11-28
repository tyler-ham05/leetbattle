# service

Node.js microservice architecture template. Each microservice is a fully standalone
Node.js/TypeScript/Express project with its own `package.json` and `node_modules`

## Layout

```
service/
  CodeValidationService/   # code validation service, port 4001
  AuthService/              # auth service, port 4002
```

## Running a service

```bash
cd CodeValidationService   # or AuthService
npm install
npm run dev   # hot reload
```

## Running PSQL Server with Docker
If you want to run a Docker PSQL server to test the application with, you can use

```bash
cd service
docker compose up 
```

note that other services will have to manually add their own sql files to the docker-compose. 
Ex.
```
volumes:
      - ./CodeService/sql/databases.sql:/docker-entrypoint-initdb.d/01-databases.sql
      - ./CodeService/sql/schema.sql:/docker-entrypoint-initdb.d/02-code-service-schema.sql
      - ./CodeService/sql/data.sql:/docker-entrypoint-initdb.d/03-code-service-data.sql
      - ./NewService/sql/databases.sql:/docker-entrypoint-initdb.d/04-databases.sql
      - ./NewService/sql/schema.sql:/docker-entrypoint-initdb.d/05-new-service-schema.sql
      - ./NewService/sql/data.sql:/docker-entrypoint-initdb.d/06-new-service-data.sql
```
If you make any changes to the sample data or create a new table, you will need to refresh the volume. Run
```
docker compose down -v
docker compose up
```


## Adding a new microservice

1. Copy an existing service folder (e.g. `CodeValidationService`) to a new name.
2. Update `name` in its `package.json` and its `PORT`. Also update port within Dockerfile
3. Run `npm install` inside the new folder (it has its own `node_modules`).
4. Update the service-wide `docker-compose.yml` with any new data tables
5. Include the new build command within the project-wide `package.json` (or ask claude to do it, i dont really care)

## AuthService: player profiles (US-7-T-5)

Signed in (`Authorization: Bearer <token>`):
- `GET /me`: your account, including `icon`, `description`, `picture` (a `data:` URL or `null`), `rating`, `league`, `leagueMin`, `nextLeague` and `recentMatches` (your last 10 matches, oldest first).
- `PATCH /account`: change any of `name`, `icon` (one of 8 keys) and `description` (80 characters at most).
- `PUT /account/picture` with `{ "image": "data:image/...;base64,..." }`: PNG, JPEG or WebP, 200 KB at most, checked by its bytes. `DELETE /account/picture` removes it.
- `GET /users/:id`: another player's public profile, never their email. 404 if there's no such player.

Match history is written by `POST /internal/match-results` (GameService only, with `INTERNAL_API_KEY`).

### Updating an existing database
`sql/schema.sql` is safe to run again: it only adds what's missing. To bring an existing local database up to date without wiping it (unlike `docker compose down -v`):
```
docker exec -i leetbattle sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"' < service/AuthService/sql/schema.sql
```
The deployed database needs the same before code that uses new columns goes live.

### Running the AuthService tests safely
The tests start by emptying the `users` table (`sql/data.sql`), so never point them at the database the app uses. Create a test database once, then run them against it:
```
docker exec leetbattle sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "CREATE DATABASE auth_service_test"'
cd service/AuthService && AUTH_POSTGRES_DB=auth_service_test npx vitest run
```
Add `POSTGRES_PORT=5433` (or whichever port) if your local Postgres isn't on 5432.

### Local profile demo
`npm run seed-demo` (from the repo root, with the database running) creates or resets a Platinum demo player in your local database only: **demo@leetbattle.local** / **demo-password**. Under `npm run dev`, your own profile also shows a Win / Lose demo panel that changes only what's on screen. See the Demo section of `docs/tasks/sprint-4/US-7-T-5.md`.
