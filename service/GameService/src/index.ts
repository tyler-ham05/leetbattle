import app from './app';
import { shutdown } from './db';

const PORT = Number(process.env.PORT) || 4004;
const SERVICE_NAME = 'game-service';

const server = app.listen(PORT, () => {
	console.log(`[${SERVICE_NAME}] listening on port ${PORT}`);
});

const gracefulShutdown = async () => {
	server.close();
	await shutdown();
	process.exit(0);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
