// US-3-T-2: team chat over the GameService socket
// All tests use a fresh game with at least two players on each team.
// All players must be confirmed to be connected to the GameService before
// running any tests, and no team is marked as left.
//
// GameService should deliver a team chat message to the sender's team
//  - A player's "chat:send" should be delivered as a "chat:message" to every connected teammate
//  - The sender should receive their own "chat:message"
//  - A "chat:message" should carry the message id, sender's user id, display name, team, text and sent time
//  - A player on the other team should not receive the "chat:message"
//
// GameService should limit message text
//  - A "chat:send" with no more than 500 characters should be delivered
//  - A "chat:send" with text longer than 500 characters should not send "chat:message"
//  - A "chat:send" with text longer than 500 characters should give the user an error saying "Message too long"
//
// GameService should save each accepted team message
//  - A valid "chat:send" should add one row to "team_messages"
//  - The saved row should have the game's id
//  - The saved row should have the sender's team
//  - The saved row should have the sender's user id
//  - The saved row should have a sent time that is set
//  - The saved row should have the message body as text
//  - A "chat:send" with text longer than 500 characters should not be saved to "team_messages"
//
// GameService should not take chat messages after the game has ended
//  - After "game:ended", a "chat:send" should not be saved to "team_messages"
//  - After "game:ended", a "chat:send" should send no "chat:message"
//
// GameService should keep chat separate between games
//  - When two games are running, a "chat:send" in one game should not reach the players of the other game
//  - The saved "team_messages" row should have the id of the game the message was sent in
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { EncryptJWT } from 'jose';
import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import { gameServer, request, socketUrl } from './setup';
import { pool } from '../src/db';
import { fakeCodeServiceFetch, sixReadyPlayers } from './fixtures';
import type { ReadyPlayer } from './fixtures';

// Mirrors the JWE session tokens AuthService issues (same as socket.test.ts):
// encrypted with the shared SECRET, carrying the account's id/email.
const SECRET = 'local-test-secret-'.padEnd(64, 'x');

// The payload GameService sends on `chat:message` (see the US-3-T-2 spec).
interface ChatMessage {
	id: string;
	userId: string;
	displayName: string;
	team: 'a' | 'b';
	text: string;
	sentAt: string;
}

let clients: Socket[] = [];
let players: ReadyPlayer[];
let gameId: string;
// Every player's socket, in roster order: 0-2 are team a, 3-5 are team b.
let sockets: Socket[];

async function tokenFor(userId: string): Promise<string> {
	return new EncryptJWT({ id: userId, email: `${userId}@example.test` })
		.setProtectedHeader({ alg: 'dir', enc: 'A256CBC-HS512' })
		.setIssuedAt()
		.setExpirationTime('5m')
		.encrypt(new TextEncoder().encode(SECRET));
}

// Resolves with the next `event` the socket receives.
function nextEvent<T>(socket: Socket, event: string): Promise<T> {
	return new Promise((resolve, reject) => {
		const timeout = setTimeout(() => reject(new Error(`Timed out waiting for ${event}`)), 2_000);
		socket.once(event, (value: T) => {
			clearTimeout(timeout);
			resolve(value);
		});
	});
}

// Connects `userId` to `gameIdToJoin` and resolves once the server has sent
// their first `game:state`, i.e. once they are in their game and team rooms.
async function joinGame(userId: string, gameIdToJoin: string): Promise<Socket> {
	const socket = io(socketUrl(), {
		autoConnect: false,
		reconnection: false,
		transports: ['websocket'],
		auth: { token: await tokenFor(userId), gameId: gameIdToJoin },
	});
	clients.push(socket);
	const joined = nextEvent<GameStatePayload>(socket, 'game:state');
	socket.connect();
	problemPool = (await joined).problemPool;
	return socket;
}

// The parts of the `game:state` payload these tests use.
interface GameStatePayload {
	phase: 'waiting' | 'banning' | 'playing';
	problemPool: { questionId: number }[];
	forfeitVotes: Record<'a' | 'b', number>;
}

// The game's nine problems, as the last player to join was sent them.
let problemPool: GameStatePayload['problemPool'];

// Resolves with the next `game:state` that satisfies `predicate`.
function nextState(socket: Socket, predicate: (_state: GameStatePayload) => boolean): Promise<GameStatePayload> {
	return new Promise((resolve, reject) => {
		const timeout = setTimeout(() => {
			socket.off('game:state', onState);
			reject(new Error('Timed out waiting for the expected game state'));
		}, 2_000);
		const onState = (state: GameStatePayload) => {
			if (!predicate(state)) return;
			clearTimeout(timeout);
			socket.off('game:state', onState);
			resolve(state);
		};
		socket.on('game:state', onState);
	});
}

// Plays the test's game to its end: every player bans a different problem so
// play starts, then team b forfeits. `afterLastVote` runs straight after
// player 5 casts team b's last forfeit vote. Resolves once team a has been
// told the game ended.
async function endGameByForfeit(afterLastVote: () => void = () => undefined): Promise<void> {
	const playing = nextState(sockets[0], (state) => state.phase === 'playing');
	for (const [i, socket] of sockets.entries()) {
		await socket.timeout(2_000).emitWithAck('game:ban', { questionId: problemPool[i].questionId });
	}
	await playing;
	const twoVotes = nextState(sockets[0], (state) => state.forfeitVotes.b === 2);
	sockets[3].emit('game:forfeit');
	sockets[4].emit('game:forfeit');
	await twoVotes;
	const ended = nextEvent(sockets[0], 'game:ended');
	sockets[5].emit('game:forfeit');
	afterLastVote();
	await ended;
}

// Player 5 sends a chat:send with `text` straight after casting team b's last
// forfeit vote, so the server handles that message once the game has ended
// but before it closes the sockets.
async function sendChatAsGameEnds(text: string): Promise<void> {
	await endGameByForfeit(() => sockets[5].emit('chat:send', { text }));
}

// Saves a team_messages row from player 0 in the test's game, sent `daysAgo`
// days ago, and resolves with its id.
async function saveMessageFromDaysAgo(daysAgo: number): Promise<string> {
	const { rows } = await pool.query<{ id: string }>(
		'INSERT INTO team_messages (game_id, team, user_id, text, sent_at) VALUES ($1, $2, $3, $4, NOW() - make_interval(days => $5)) RETURNING id',
		[gameId, 'a', players[0].userId, 'old message', daysAgo],
	);
	return rows[0].id;
}

// Waits until the server has processed every client disconnect, so one
// test's sockets are gone before the next test starts.
async function waitForServerSockets(count: number): Promise<void> {
	const deadline = Date.now() + 2_000;
	while (gameServer.io.sockets.sockets.size !== count) {
		if (Date.now() > deadline) throw new Error('Timed out waiting for sockets to close');
		await new Promise((resolve) => setTimeout(resolve, 10));
	}
}

// Connects `userId` to `gameIdToJoin` and resolves with the chat:history the
// server sends them on connect. Listens before connecting, because the
// history is sent as soon as the player joins, before their first game:state.
async function joinAndGetHistory(userId: string, gameIdToJoin = gameId): Promise<ChatMessage[]> {
	const socket = io(socketUrl(), {
		autoConnect: false,
		reconnection: false,
		transports: ['websocket'],
		auth: { token: await tokenFor(userId), gameId: gameIdToJoin },
	});
	clients.push(socket);
	const history = nextEvent<ChatMessage[]>(socket, 'chat:history');
	socket.connect();
	return history;
}

// A second fresh 3v3 game, running at the same time as the test's game, with
// every player connected. Its sockets are in roster order like `sockets`.
async function secondGame(): Promise<{ gameId: string; players: ReadyPlayer[]; sockets: Socket[] }> {
	const roster = sixReadyPlayers();
	const res = await request.put('/game').send({ players: roster });
	const joined: Socket[] = [];
	for (const player of roster) joined.push(await joinGame(player.userId, res.body.gameId));
	return { gameId: res.body.gameId, players: roster, sockets: joined };
}

// A row of team_messages, as pg returns it.
interface TeamMessageRow {
	id: string;
	game_id: string;
	team: 'a' | 'b';
	user_id: string;
	text: string;
	sent_at: Date;
}

// Player 0 (team a) sends `text`; once a teammate has the message, resolves
// with the row it saved in team_messages.
async function sendAndReadSavedRow(text = 'hello team'): Promise<TeamMessageRow> {
	const teammate = nextEvent<ChatMessage>(sockets[1], 'chat:message');
	sockets[0].emit('chat:send', { text });
	const { id } = await teammate;
	const { rows } = await pool.query<TeamMessageRow>('SELECT * FROM team_messages WHERE id = $1', [id]);
	return rows[0];
}

beforeAll(() => {
	process.env.SECRET = SECRET;
	// Creating a game asks CodeService for problems; stand in for it.
	vi.stubGlobal('fetch', fakeCodeServiceFetch());
});

// A fresh 3v3 game per test with every player connected.
beforeEach(async () => {
	players = sixReadyPlayers();
	const res = await request.put('/game').send({ players });
	gameId = res.body.gameId;
	sockets = [];
	for (const player of players) sockets.push(await joinGame(player.userId, gameId));
});

afterEach(async () => {
	for (const client of clients) client.disconnect();
	clients = [];
	await waitForServerSockets(0);
});

afterAll(() => {
	vi.unstubAllGlobals();
});

describe('team chat delivery', () => {
	it('US-3-T-2 delivers a chat:send as a chat:message to every connected teammate', async () => {
		// Player 0 (team a) sends; players 1 and 2 are their teammates.
		const teammates = [nextEvent<ChatMessage>(sockets[1], 'chat:message'), nextEvent<ChatMessage>(sockets[2], 'chat:message')];
		sockets[0].emit('chat:send', { text: 'hello team' });
		const received = await Promise.all(teammates);
		expect(received.map((message) => message.text)).toEqual(['hello team', 'hello team']);
	});

	it('US-3-T-2 sends the sender their own chat:message', async () => {
		const own = nextEvent<ChatMessage>(sockets[0], 'chat:message');
		sockets[0].emit('chat:send', { text: 'hello team' });
		expect((await own).text).toBe('hello team');
	});

	it('US-3-T-2 sends the message id, sender\'s user id, display name, team, text and sent time on chat:message', async () => {
		const received = nextEvent<ChatMessage>(sockets[1], 'chat:message');
		sockets[0].emit('chat:send', { text: 'hello team' });
		// The id and sent time are made by the server, so only their type is known here.
		expect(await received).toEqual({
			id: expect.any(String),
			userId: players[0].userId,
			displayName: players[0].displayName,
			team: 'a',
			text: 'hello team',
			sentAt: expect.any(String),
		});
	});

	it('US-3-T-2 does not deliver a chat:message to a player on the other team', async () => {
		// Player 3 is on team b; record anything they receive.
		const otherTeam: ChatMessage[] = [];
		sockets[3].on('chat:message', (message: ChatMessage) => otherTeam.push(message));
		const teammate = nextEvent<ChatMessage>(sockets[1], 'chat:message');
		sockets[0].emit('chat:send', { text: 'hello team' });
		// Once the teammate has the message, give the other team the same time
		// again to receive one if it was (wrongly) sent to them too.
		await teammate;
		await new Promise((resolve) => setTimeout(resolve, 100));
		expect(otherTeam).toEqual([]);
	});
});

describe('team chat message length', () => {
	it('US-3-T-2 delivers a chat:send with no more than 500 characters', async () => {
		const longest = 'a'.repeat(500);
		const teammate = nextEvent<ChatMessage>(sockets[1], 'chat:message');
		sockets[0].emit('chat:send', { text: longest });
		expect((await teammate).text).toBe(longest);
	});

	it('US-3-T-2 does not send a chat:message for a chat:send longer than 500 characters', async () => {
		// Record every message the teammate receives.
		const received: string[] = [];
		sockets[1].on('chat:message', (message: ChatMessage) => received.push(message.text));
		sockets[0].emit('chat:send', { text: 'a'.repeat(501) });
		// The server handles one socket's events in order, so once this valid
		// follow-up arrives, the too-long one has already been handled.
		const followUp = nextEvent<ChatMessage>(sockets[1], 'chat:message');
		sockets[0].emit('chat:send', { text: 'follow-up' });
		await followUp;
		expect(received).toEqual(['follow-up']);
	});

	it('US-3-T-2 answers a chat:send longer than 500 characters with "Message too long"', async () => {
		// Like game:ban and game:submit, the answer comes back on the event's acknowledgement.
		const answer = await sockets[0].timeout(2_000).emitWithAck('chat:send', { text: 'a'.repeat(501) });
		expect(answer).toEqual({ error: 'Message too long' });
	});
});

describe('saving team chat messages', () => {
	it('US-3-T-2 adds one row to team_messages for a valid chat:send', async () => {
		// The message is saved before it is sent out, so once the teammate has it the row exists.
		const teammate = nextEvent<ChatMessage>(sockets[1], 'chat:message');
		sockets[0].emit('chat:send', { text: 'hello team' });
		await teammate;
		const { rows } = await pool.query('SELECT COUNT(*)::int AS count FROM team_messages WHERE game_id = $1', [gameId]);
		expect(rows[0].count).toBe(1);
	});

	it('US-3-T-2 saves the game\'s id on the row', async () => {
		const row = await sendAndReadSavedRow();
		expect(row.game_id).toBe(gameId);
	});

	it('US-3-T-2 saves the sender\'s team on the row', async () => {
		const row = await sendAndReadSavedRow();
		expect(row.team).toBe('a');
	});

	it('US-3-T-2 saves the sender\'s user id on the row', async () => {
		const row = await sendAndReadSavedRow();
		expect(row.user_id).toBe(players[0].userId);
	});

	it('US-3-T-2 saves a sent time on the row', async () => {
		const row = await sendAndReadSavedRow();
		// pg turns a set TIMESTAMPTZ into a Date (and an unset one into null).
		expect(row.sent_at).toBeInstanceOf(Date);
	});

	it('US-3-T-2 saves the message body as text on the row', async () => {
		const row = await sendAndReadSavedRow('saved body');
		expect(row.text).toBe('saved body');
	});

	it('US-3-T-2 does not save a chat:send longer than 500 characters', async () => {
		// The "Message too long" answer means the server is done with this message.
		await sockets[0].timeout(2_000).emitWithAck('chat:send', { text: 'a'.repeat(501) });
		const { rows } = await pool.query('SELECT COUNT(*)::int AS count FROM team_messages WHERE game_id = $1', [gameId]);
		expect(rows[0].count).toBe(0);
	});
});

describe('team chat after the game has ended', () => {
	it('US-3-T-2 sends no chat:message for a chat:send sent after game:ended', async () => {
		// The players' sockets close as the game ends, so a message sent after
		// that would reach no client; watch what the server sends out instead.
		const broadcast = vi.spyOn(gameServer.io.of('/').adapter, 'broadcast');
		await sendChatAsGameEnds('too late');
		// Give a (wrongly) accepted message time to be saved and sent.
		await new Promise((resolve) => setTimeout(resolve, 100));
		const chatMessages = broadcast.mock.calls.filter(([packet]) => packet.data?.[0] === 'chat:message');
		broadcast.mockRestore();
		expect(chatMessages).toEqual([]);
	});
});

describe('team chat with two games running', () => {
	it('US-3-T-2 does not deliver a chat:send in one game to the players of the other game', async () => {
		const other = await secondGame();
		// Record anything any player of the other game receives.
		const otherGame: ChatMessage[] = [];
		for (const socket of other.sockets) socket.on('chat:message', (message: ChatMessage) => otherGame.push(message));
		const teammate = nextEvent<ChatMessage>(sockets[1], 'chat:message');
		sockets[0].emit('chat:send', { text: 'hello team' });
		// Once the teammate has the message, give the other game the same time
		// again to receive one if it was (wrongly) sent to them too.
		await teammate;
		await new Promise((resolve) => setTimeout(resolve, 100));
		expect(otherGame).toEqual([]);
	});

	it('US-3-T-2 saves the id of the game the message was sent in', async () => {
		const other = await secondGame();
		// Sent in the second game this time, so a row saved under the test's game would show up.
		const teammate = nextEvent<ChatMessage>(other.sockets[1], 'chat:message');
		other.sockets[0].emit('chat:send', { text: 'hello team' });
		const { id } = await teammate;
		const { rows } = await pool.query<TeamMessageRow>('SELECT * FROM team_messages WHERE id = $1', [id]);
		expect(rows[0].game_id).toBe(other.gameId);
	});

	it('US-3-T-2 does not save a chat:send sent after game:ended', async () => {
		await sendChatAsGameEnds('too late');
		// Give a (wrongly) accepted message time to finish saving.
		await new Promise((resolve) => setTimeout(resolve, 100));
		const { rows } = await pool.query('SELECT COUNT(*)::int AS count FROM team_messages WHERE game_id = $1', [gameId]);
		expect(rows[0].count).toBe(0);
	});
});

describe('team chat rate limiting', () => {
	it('US-3-T-4 rejects a second chat:send from the same player within 1 second with "Whoa, slow down!"', async () => {
		// The first message is accepted; wait until a teammate has it.
		const teammate = nextEvent<ChatMessage>(sockets[1], 'chat:message');
		sockets[0].emit('chat:send', { text: 'first' });
		await teammate;
		// Sent straight after, well within 1 second of the first.
		const answer = await sockets[0].timeout(2_000).emitWithAck('chat:send', { text: 'second' });
		expect(answer).toEqual({ error: 'Whoa, slow down!' });
	});

	it('US-3-T-4 answers an accepted chat:send with { ok: true }', async () => {
		// The frontend clears the message box only once it hears the message was accepted.
		const answer = await sockets[0].timeout(2_000).emitWithAck('chat:send', { text: 'hello team' });
		expect(answer).toEqual({ ok: true });
	});

	it('US-3-T-4 does not save a rate-limited chat:send to team_messages', async () => {
		const teammate = nextEvent<ChatMessage>(sockets[1], 'chat:message');
		sockets[0].emit('chat:send', { text: 'first' });
		await teammate;
		// The "Whoa, slow down!" answer means the server is done with this message.
		await sockets[0].timeout(2_000).emitWithAck('chat:send', { text: 'second' });
		const { rows } = await pool.query<TeamMessageRow>('SELECT * FROM team_messages WHERE game_id = $1', [gameId]);
		expect(rows.map((row) => row.text)).toEqual(['first']);
	});

	it('US-3-T-4 sends no chat:message for a rate-limited chat:send', async () => {
		// Record every message the teammate receives.
		const received: string[] = [];
		sockets[1].on('chat:message', (message: ChatMessage) => received.push(message.text));
		const first = nextEvent<ChatMessage>(sockets[1], 'chat:message');
		sockets[0].emit('chat:send', { text: 'first' });
		await first;
		await sockets[0].timeout(2_000).emitWithAck('chat:send', { text: 'second' });
		// Give a (wrongly) accepted message time to be saved and sent.
		await new Promise((resolve) => setTimeout(resolve, 100));
		expect(received).toEqual(['first']);
	});
});

describe('team chat text with SQL in it', () => {
	const sql = '\'); DROP TABLE team_messages; --';

	it('US-3-T-4 saves a message containing SQL as plain text', async () => {
		const row = await sendAndReadSavedRow(sql);
		expect(row.text).toBe(sql);
	});

	it('US-3-T-4 does not run a message containing SQL as a SQL command', async () => {
		await sendAndReadSavedRow(sql);
		// Had the text run, team_messages would be gone and this query would throw.
		const { rows } = await pool.query('SELECT COUNT(*)::int AS count FROM team_messages WHERE game_id = $1', [gameId]);
		expect(rows[0].count).toBe(1);
	});
});

describe('old team chat cleanup', () => {
	it('US-3-T-4 deletes messages older than 10 days when a game ends', async () => {
		const id = await saveMessageFromDaysAgo(11);
		await endGameByForfeit();
		const { rows } = await pool.query('SELECT id FROM team_messages WHERE id = $1', [id]);
		expect(rows).toEqual([]);
	});

	it('US-3-T-4 keeps messages newer than 10 days when a game ends', async () => {
		const id = await saveMessageFromDaysAgo(9);
		await endGameByForfeit();
		const { rows } = await pool.query('SELECT id FROM team_messages WHERE id = $1', [id]);
		expect(rows).toEqual([{ id }]);
	});
});

describe('team chat history', () => {
	it('US-3-T-3 sends a reconnecting player chat:history with both messages their teammates sent', async () => {
		// Players 0 and 1 (team a) each send a message; wait until player 2 has both.
		const first = nextEvent<ChatMessage>(sockets[2], 'chat:message');
		sockets[0].emit('chat:send', { text: 'first' });
		await first;
		const second = nextEvent<ChatMessage>(sockets[2], 'chat:message');
		sockets[1].emit('chat:send', { text: 'second' });
		await second;

		// Player 2 drops and reconnects.
		sockets[2].disconnect();
		const history = await joinAndGetHistory(players[2].userId);

		// Sorted so this only checks both are there; the next test checks the order.
		expect(history.map((message) => message.text).sort()).toEqual(['first', 'second']);
	});
});
