import { Pool } from 'pg';
import * as path from 'node:path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });

export const pool = process.env.INSTANCE_CONNECTION_NAME
	? new Pool({
		host: `/cloudsql/${process.env.INSTANCE_CONNECTION_NAME}`,
		database: process.env.LOBBY_POSTGRES_DB ?? 'lobby_service',
		user: process.env.POSTGRES_USER,
		password: process.env.POSTGRES_PASSWORD,
	})
	: new Pool({
		host: process.env.POSTGRES_HOST,
		port: Number(process.env.POSTGRES_PORT),
		database: process.env.LOBBY_POSTGRES_DB ?? 'lobby_service',
		user: process.env.POSTGRES_USER,
		password: process.env.POSTGRES_PASSWORD,
	});

export async function shutdown(): Promise<void> {
	await pool.end();
}
