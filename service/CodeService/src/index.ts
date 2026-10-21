import app from './app';
import { shutdown } from './db';

const PORT = 4001;
const SERVICE_NAME = 'code-service';

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
