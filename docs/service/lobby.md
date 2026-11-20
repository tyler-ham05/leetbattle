# Lobby Microservice
LobbyService is its own Socket.IO, and joining the lobby requires a logged-in account.

The user would have access to the home page after creating an account and logging in, and they can join a lobby, take one of six seats, choose either team, and see live updates as other players join the lobby.

Each player can ready up after all six connected players have chosen teams. When everyone is ready, a five-second countdown begins and cancels if someone becomes unready or disconnects. At zero, LobbyService emits `lobby:ready-for-match`; the match service will handle creating and starting the actual match.
- Update: LobbyService makes a direct call to GameService, and handles starting the match. LobbyService emits 'lobby:game-started' along with the gameId and closes the websocket.

Lobby membership, display names, and team assignments are stored in the lobby_service Postgres database. Socket connection status and the 30-second reconnect grace period are kept in memory by LobbyService.

Postgres lets lobby data survive a LobbyService restart and be shared by its instances. However, Postgres does not relay live Socket.IO updates between instances. If LobbyService runs on multiple instances, it will need a shared message system such as Redis Pub/Sub with the Socket.IO Redis adapter. A single-instance demo does not need Redis.

frontend/app/lobby/socket-context.tsx creates the authenticated Socket.IO client when a signed-in user opens the lobby page

frontend/app/lobby/page.tsx displays lobby count, teams, readiness, and the countdown

## Deployment / configuration

### Frontend -> LobbyService URL
The frontend connects to LobbyService at `NEXT_PUBLIC_LOBBY_URL`, which is set in `frontend/Dockerfile`. When running the frontend locally without Docker, the variable is unset and the frontend uses `http://localhost:4003`. The URL is built into the image, so changing it means rebuilding the frontend (should be done automatically by cloud build). 

You can override it when building using `--build-arg`:

```bash
docker build --build-arg NEXT_PUBLIC_LOBBY_URL=https://someURL -t frontend ./frontend
```

If the lobby URL changes, rebuild and redeploy the frontend image.
