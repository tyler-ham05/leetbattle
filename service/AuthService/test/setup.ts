import { afterAll, beforeAll } from 'vitest';
import supertest from 'supertest';
import TestAgent from 'supertest/lib/agent';

import * as http from 'http';
import app from '../src/app';

let server: http.Server<
  typeof http.IncomingMessage,
  typeof http.ServerResponse
>;

export let request: TestAgent;

beforeAll(() => {
	server = http.createServer(app);
	server.listen();
	request = supertest(server);
});

afterAll(() => {
	server.close();
});
