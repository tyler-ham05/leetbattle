import * as path from 'node:path';
import dotenv from 'dotenv';
import { createLobbyService } from './server';
import { pool, shutdown } from './db';
import { PostgresLobbyStore } from './postgres-lobby-store';

dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });

const PORT = Number(process.env.PORT ?? process.env.LOBBY_PORT) || 4003;
const lobbyService = createLobbyService({ store: new PostgresLobbyStore(pool) });

void lobbyService.ready.then(() => {
	lobbyService.httpServer.listen(PORT, () => {
		console.log(`[lobby-service] listening on port ${PORT}`);
	});
}).catch((error: unknown) => {
	console.error('[lobby-service] could not load lobby state from Postgres', error);
	process.exitCode = 1;
	void shutdown();
});

const stop = async () => {
	await lobbyService.close();
	await shutdown();
};

process.on('SIGTERM', () => void stop());
process.on('SIGINT', () => void stop());
