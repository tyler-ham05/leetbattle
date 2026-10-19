# service

Node.js microservice architecture template. Each microservice is a fully standalone
Node.js/TypeScript/Express project with its own `package.json` and `node_modules` —
no shared workspace or hoisted dependencies.

## Layout

```
service/
  CodeValidationService/   # dummy code validation service, port 4001
  AuthService/              # dummy auth service, port 4002
```

## Running a service

```bash
cd CodeValidationService   # or AuthService
npm install
npm run dev   # hot reload
```

Each service exposes `/` and `/health`, plus its own domain endpoints:

- **CodeValidationService**: `POST /validate` — accepts `{ code, language }`, returns a dummy judge verdict.
- **AuthService**: `POST /register`, `POST /login`, `GET /me` — dummy auth flow, no real persistence yet.

## Running everything with Docker

```bash
cd service
docker compose up --build
```

## Adding a new microservice

1. Copy an existing service folder (e.g. `CodeValidationService`) to a new name.
2. Update `name` in its `package.json` and its `PORT`.
3. Run `npm install` inside the new folder (it has its own `node_modules`).
4. Add it to `docker-compose.yml` if it should run in the Docker stack.
