import * as path from 'node:path';
import dotenv from 'dotenv';
import { createQueueService } from './server';

dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });

const PORT = Number(process.env.PORT ?? process.env.QUEUE_PORT) || 4005;
const queueService = createQueueService();

queueService.httpServer.listen(PORT, () => {
	console.log(`[queue-service] listening on port ${PORT}`);
});

const stop = () => void queueService.close();

process.on('SIGTERM', stop);
process.on('SIGINT', stop);
