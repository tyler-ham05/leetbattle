# Static lobby

The first lobby is a single shared room with two teams of three. Membership is
stored in the `code_service` database so all CodeService instances share the
same player count. The lobby screen polls every 2.5 seconds; match WebSockets
are outside this feature's scope.

## Anonymous player identity

`POST /lobby/session` creates a player identity the first time a browser opens
the lobby. The server returns a random bearer token; the frontend stores it in
that browser's local storage, and the database stores only its SHA-256 hash.
This is anonymous identity, not account authentication. A player who clears
browser storage loses access to that identity. The lobby membership references
an internal player UUID, leaving room to associate it with an authenticated
account later.

Players are considered active while their browser polls the lobby. Membership
for sessions inactive for 60 seconds is cleared automatically. The Leave
button removes membership immediately.

## API

- `POST /lobby/session` — create or resume an anonymous player session.
- `GET /lobby` — return the current players and the caller's player ID.
- `PATCH /lobby/name` with `{ "displayName": "..." }` — set a 1–24 character display name.
- `POST /lobby/join` with `{ "team": "a" | "b" }` — join or switch teams.
- `DELETE /lobby/leave` — leave the lobby.

The API enforces three players per team inside a database transaction. A full
team returns HTTP `409`.

## Database setup

Fresh local Postgres databases created by `docker compose up` run
`service/CodeService/sql/lobby.sql` automatically. For an existing database,
apply that SQL file to `code_service` once before using the lobby endpoints.
