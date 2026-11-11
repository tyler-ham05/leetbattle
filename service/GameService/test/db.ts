import * as fs from 'fs';
import * as path from 'path';

import {pool, shutdown} from '../src/db';

const run = async (file: string) => {
	const content = fs.readFileSync(file, 'utf8');
	const lines = content.split(/\r?\n/);
	let statement = '';
	for (let line of lines) {
		line = line.trim();
		if (!line.startsWith('--') && !line.startsWith('\\')) {
			statement += ' ' + line + '\n';
			if (line.endsWith(';')) {
				await pool.query(statement);
				statement = '';
			}
		}
	}
};

const reset = async () => {
	const sqlDir = path.resolve(__dirname, '../sql');

	await run(path.join(sqlDir, 'schema.sql'));
	await run(path.join(sqlDir, 'data.sql'));
};

export { reset, shutdown };