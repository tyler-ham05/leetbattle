// US-7-T-5: creates (or refreshes) the demo player in the database from the
// normal settings (root .env), e.g. from the project root:
//   POSTGRES_PORT=5433 npm run seed-demo
// Only the demo user and their match history are written. sql/schema.sql is
// applied first (every statement in it is IF NOT EXISTS or otherwise safe to
// repeat, and it deletes nothing) so a database made before match_history
// existed gets the table; sql/data.sql, which empties users, is never run.
import * as fs from 'fs';
import * as path from 'path';
import { seedDemo } from '../src/demo';
import { pool, shutdown } from '../src/db';

// schema.sql without its psql-only `\c` line and comments, as one multi-statement query.
const schema = fs.readFileSync(path.resolve(__dirname, '../sql/schema.sql'), 'utf8')
	.split(/\r?\n/)
	.filter((line) => !line.trim().startsWith('\\') && !line.trim().startsWith('--'))
	.join('\n');

pool.query(schema)
	.then(() => seedDemo())
	.then(({ id, email, password }) => {
		console.log(`[seed-demo] demo player ready (id ${id})`);
		console.log(`[seed-demo]   email:    ${email}`);
		console.log(`[seed-demo]   password: ${password}`);
	})
	.catch((err: unknown) => {
		console.error('[seed-demo] could not seed the demo player', err);
		process.exitCode = 1;
	})
	.finally(() => shutdown());
