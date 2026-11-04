import { Pool } from 'pg';
import * as path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });

const pool = process.env.INSTANCE_CONNECTION_NAME
	? new Pool({
		host: `/cloudsql/${process.env.INSTANCE_CONNECTION_NAME}`,
		database: process.env.AUTH_POSTGRES_DB,
		user: process.env.POSTGRES_USER,
		password: process.env.POSTGRES_PASSWORD,
	})
	: new Pool({
		host: process.env.POSTGRES_HOST,
		port: Number(process.env.POSTGRES_PORT),
		database: process.env.AUTH_POSTGRES_DB,
		user: process.env.POSTGRES_USER,
		password: process.env.POSTGRES_PASSWORD,
	});

const shutdown = async () => {
	await pool.end();
};

export { pool, shutdown };
