
import {beforeAll, afterAll} from 'vitest';
import supertest from 'supertest';
import TestAgent from 'supertest/lib/agent';

// The pool itself; the schema helpers in ./db only run in test/global-setup.ts.
import { shutdown } from '../src/db';
import app from '../src/app';
import { createGameServer } from '../src/server';

// One server carries both the Express routes and the socket.io endpoint, the
// same way src/index.ts wires them in production, so a game created over
// HTTP in a test is the game the socket tests then connect to.
export let gameServer: ReturnType<typeof createGameServer>;
export let request: TestAgent;

// Where socket tests point socket.io-client. Only known once the server has
// bound its random port, hence a function rather than a constant.
export function socketUrl(): string {
	const address = gameServer.httpServer.address();
	if (!address || typeof address === 'string') throw new Error('Game test server did not bind a TCP port.');
	return `http://127.0.0.1:${address.port}`;
}

beforeAll(async () => {
	// Short timers so lifecycle tests don't wait the real 5 s join wait / 30 s
	// reconnect window / 5 s submit cooldown / 30 s ban and pick windows / 3 s
	// ban reveal (socket.test.ts and ban-vote.test.ts rely on these values).
	// The ban and pick windows are deliberately longer than the reconnect
	// window, so a player can run out of time to reconnect while the bans or
	// picks are still going on. The ban window always runs in full now
	// (US-8-T-1), so every test that needs a playing game waits it out, which
	// is why it is shorter than it used to be.
	//
	// `choose` settles a tie, a team that did not vote and both teams voting
	// for the same question. Taking the first candidate makes those outcomes
	// predictable, where the real match picks at random.
	gameServer = createGameServer(app, {
		joinWaitMs: 300,
		reconnectGraceMs: 300,
		submitCooldownMs: 100,
		banWindowMs: 700,
		banRevealMs: 100,
		pickWindowMs: 700,
		choose: (choices) => choices[0],
	});
	await new Promise<void>((resolve) => gameServer.httpServer.listen(0, '127.0.0.1', resolve));
	request = supertest(gameServer.httpServer);
	// The schema is reset once for the whole run in test/global-setup.ts, not
	// here: test files run in parallel and would race each other's CREATE TABLEs.
});

afterAll(async () => {
	await gameServer.close();
	await shutdown();
});
