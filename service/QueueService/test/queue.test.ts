// US-9-T-2: Ladder matchmaking queues (QueueService)
// Acceptance criteria covered:
//   - Two players in 1v1 are sent the same new game
//   - Four players in 2v2 make one game with two teams of 2
//   - Six players in 3v3 make one game with two teams of 3
//   - With too few players no game is created and players keep waiting
//   - Joining another queue moves the player out of the old one
//   - A player who leaves (or disconnects) is never matched
//   - Four players joining 1v1 at once make two separate games
//   - Only GameService PUT /game is called, never LobbyService
//   - If GameService fails, players get game-start-failed and stay queued in order
// Also: login token required, userId taken from the token, unknown queue rejected.
import { describe, expect, it } from 'vitest';
import {
	GAME_SERVICE_URL,
	LOBBY_SERVICE_URL,
	connectPlayers,
	connectUser,
	connectWithInvalidToken,
	createdGame,
	everyMatchedUserId,
	gameRequests,
	gameServiceFetch,
	gameServiceResponse,
	joinAtOnce,
	joinInOrder,
	joinQueue,
	joinUntilMatched,
	latestState,
	nextEvent,
	nextState,
	requestedUrls,
	settle,
	userIds,
} from './helpers';

describe('US-9-T-2 signing in', () => {
	it('US-9-T-2 rejects a connection without a valid login token', async () => {
		expect(await connectWithInvalidToken()).toBe('unauthorized');
	});

	it('US-9-T-2 sends GameService the userId from the login token, not one the client sent', async () => {
		const spoofer = await connectUser('p-0', { userId: 'someone-else' });
		const [other] = await connectPlayers('q', 1);
		await joinUntilMatched([spoofer, other], '1v1');

		expect(gameRequests()[0][0].userId).toBe('p-0');
	});

	it('US-9-T-2 rejects a queue that does not exist with invalid-queue', async () => {
		const [player] = await connectPlayers('p', 1);
		const error = nextEvent<{ code: string }>(player, 'queue:error');
		player.emit('queue:join', '4v4');

		expect((await error).code).toBe('invalid-queue');
	});
});

describe('US-9-T-2 1v1 queue (criterion 3)', () => {
	it('US-9-T-2 asks GameService for one game when two players join the 1v1 queue', async () => {
		await joinUntilMatched(await connectPlayers('p', 2), '1v1');

		expect(gameServiceFetch).toHaveBeenCalledTimes(1);
	});

	it('US-9-T-2 creates the game with a PUT to GameService /game', async () => {
		await joinUntilMatched(await connectPlayers('p', 2), '1v1');
		const [url, init] = gameServiceFetch.mock.calls[0];

		expect([String(url), (init as RequestInit).method]).toEqual([`${GAME_SERVICE_URL}/game`, 'PUT']);
	});

	it('US-9-T-2 sends both players to GameService, the first to join on team a', async () => {
		await joinUntilMatched(await connectPlayers('p', 2), '1v1');

		expect(gameRequests()[0]).toEqual([
			{ userId: 'p-0', displayName: 'Player p-0', team: 'a' },
			{ userId: 'p-1', displayName: 'Player p-1', team: 'b' },
		]);
	});

	it('US-9-T-2 sends both players the same new gameId', async () => {
		const matched = await joinUntilMatched(await connectPlayers('p', 2), '1v1');

		expect(matched.map(({ gameId }) => gameId)).toEqual(['game-1', 'game-1']);
	});

	it('US-9-T-2 takes matched players out of the 1v1 queue', async () => {
		const [watcher] = await connectPlayers('watcher', 1);
		await joinUntilMatched(await connectPlayers('p', 2), '1v1');
		await settle();

		expect(latestState(watcher)?.counts['1v1']).toBe(0);
	});
});

describe('US-9-T-2 2v2 queue (criterion 4)', () => {
	it('US-9-T-2 asks GameService for one game when four players join the 2v2 queue', async () => {
		await joinUntilMatched(await connectPlayers('p', 4), '2v2');

		expect(gameServiceFetch).toHaveBeenCalledTimes(1);
	});

	it('US-9-T-2 splits the four players into two teams of 2 in join order', async () => {
		await joinUntilMatched(await connectPlayers('p', 4), '2v2');

		expect(gameRequests()[0].map(({ userId, team }) => [userId, team])).toEqual([
			['p-0', 'a'], ['p-1', 'a'], ['p-2', 'b'], ['p-3', 'b'],
		]);
	});

	it('US-9-T-2 sends all four players the same gameId', async () => {
		const matched = await joinUntilMatched(await connectPlayers('p', 4), '2v2');

		expect(new Set(matched.map(({ gameId }) => gameId))).toEqual(new Set(['game-1']));
	});
});

describe('US-9-T-2 3v3 queue (criterion 5)', () => {
	it('US-9-T-2 asks GameService for one game when six players join the 3v3 queue', async () => {
		await joinUntilMatched(await connectPlayers('p', 6), '3v3');

		expect(gameServiceFetch).toHaveBeenCalledTimes(1);
	});

	it('US-9-T-2 splits the six players into two teams of 3 in join order', async () => {
		await joinUntilMatched(await connectPlayers('p', 6), '3v3');

		expect(gameRequests()[0].map(({ userId, team }) => [userId, team])).toEqual([
			['p-0', 'a'], ['p-1', 'a'], ['p-2', 'a'], ['p-3', 'b'], ['p-4', 'b'], ['p-5', 'b'],
		]);
	});

	it('US-9-T-2 sends all six players the same gameId', async () => {
		const matched = await joinUntilMatched(await connectPlayers('p', 6), '3v3');

		expect(new Set(matched.map(({ gameId }) => gameId))).toEqual(new Set(['game-1']));
	});
});

describe('US-9-T-2 not enough players (criterion 6)', () => {
	it('US-9-T-2 does not create a game for one player in the 1v1 queue', async () => {
		await joinInOrder(await connectPlayers('p', 1), '1v1');
		await settle();

		expect(gameServiceFetch).not.toHaveBeenCalled();
	});

	it('US-9-T-2 does not create a game for three players in the 2v2 queue', async () => {
		await joinInOrder(await connectPlayers('p', 3), '2v2');
		await settle();

		expect(gameServiceFetch).not.toHaveBeenCalled();
	});

	it('US-9-T-2 does not create a game for five players in the 3v3 queue', async () => {
		await joinInOrder(await connectPlayers('p', 5), '3v3');
		await settle();

		expect(gameServiceFetch).not.toHaveBeenCalled();
	});

	it('US-9-T-2 keeps a player waiting in the queue until enough players join', async () => {
		const players = await connectPlayers('p', 3);
		await joinInOrder(players, '2v2');
		await settle();

		expect(latestState(players[0])?.queue).toBe('2v2');
	});

	it('US-9-T-2 shows every client how many players wait in each queue', async () => {
		const [watcher] = await connectPlayers('watcher', 1);
		await joinInOrder(await connectPlayers('p', 3), '2v2');
		await settle();

		expect(latestState(watcher)?.counts).toEqual({ '1v1': 0, '2v2': 3, '3v3': 0 });
	});

	it('US-9-T-2 does not match players waiting in different queues with each other', async () => {
		const [one, two] = await connectPlayers('p', 2);
		await joinQueue(one, '1v1');
		await joinQueue(two, '2v2');
		await settle();

		expect(gameServiceFetch).not.toHaveBeenCalled();
	});
});

describe('US-9-T-2 switching queues (criterion 7)', () => {
	it('US-9-T-2 moves a player in the 1v1 queue into the 2v2 queue they join', async () => {
		const [player] = await connectPlayers('p', 1);
		await joinQueue(player, '1v1');

		expect((await joinQueue(player, '2v2')).queue).toBe('2v2');
	});

	it('US-9-T-2 takes a player who switches out of their previous queue', async () => {
		const [player] = await connectPlayers('p', 1);
		await joinQueue(player, '1v1');

		expect((await joinQueue(player, '2v2')).counts['1v1']).toBe(0);
	});

	it('US-9-T-2 does not match a player who switched away into their previous queue', async () => {
		const [switcher, other] = await connectPlayers('p', 2);
		await joinQueue(switcher, '1v1');
		await joinQueue(switcher, '2v2');
		await joinQueue(other, '1v1');
		await settle();

		expect(gameServiceFetch).not.toHaveBeenCalled();
	});

	it('US-9-T-2 matches a player who switched with the players in their new queue', async () => {
		const [switcher, other] = await connectPlayers('p', 2);
		await joinQueue(switcher, '2v2');
		await joinQueue(other, '1v1');
		await joinUntilMatched([switcher], '1v1');

		expect(everyMatchedUserId()).toEqual(['p-0', 'p-1']);
	});

	it('US-9-T-2 keeps one place for a player who joins the same queue twice', async () => {
		const [player] = await connectPlayers('p', 1);
		await joinQueue(player, '2v2');
		player.emit('queue:join', '2v2');
		await settle();

		expect(latestState(player)?.counts['2v2']).toBe(1);
	});
});

describe('US-9-T-2 leaving a queue (criterion 8)', () => {
	it('US-9-T-2 shows a player who leaves as no longer waiting', async () => {
		const [player] = await connectPlayers('p', 1);
		await joinQueue(player, '1v1');
		const left = nextState(player, (state) => state.queue === null);
		player.emit('queue:leave');

		expect((await left).counts['1v1']).toBe(0);
	});

	it('US-9-T-2 does not match a player who left the queue', async () => {
		const [leaver, other] = await connectPlayers('p', 2);
		await joinQueue(leaver, '1v1');
		const left = nextState(leaver, (state) => state.queue === null);
		leaver.emit('queue:leave');
		await left;
		await joinQueue(other, '1v1');
		await settle();

		expect(gameServiceFetch).not.toHaveBeenCalled();
	});

	it('US-9-T-2 does not match a player who disconnected while waiting', async () => {
		const [leaver, other] = await connectPlayers('p', 2);
		await joinQueue(leaver, '1v1');
		leaver.disconnect();
		await nextState(other, (state) => state.counts['1v1'] === 0);
		await joinQueue(other, '1v1');
		await settle();

		expect(gameServiceFetch).not.toHaveBeenCalled();
	});
});

describe('US-9-T-2 players joining at the same time (criterion 9)', () => {
	it('US-9-T-2 creates two games when four players join the 1v1 queue at once', async () => {
		joinAtOnce(await connectPlayers('p', 4), '1v1');
		await settle();

		expect(gameServiceFetch).toHaveBeenCalledTimes(2);
	});

	it('US-9-T-2 puts each of the four players in exactly one game', async () => {
		joinAtOnce(await connectPlayers('p', 4), '1v1');
		await settle();

		expect(everyMatchedUserId()).toEqual(userIds('p', 4));
	});

	it('US-9-T-2 sends the two pairs two different gameIds', async () => {
		const players = await connectPlayers('p', 4);
		const matched = Promise.all(players.map((player) => nextEvent<{ gameId: string }>(player, 'queue:matched')));
		joinAtOnce(players, '1v1');

		expect(new Set((await matched).map(({ gameId }) => gameId)).size).toBe(2);
	});
});

describe('US-9-T-2 LobbyService is not involved (criterion 10)', () => {
	it('US-9-T-2 sends every request for a ladder match to GameService /game', async () => {
		await joinUntilMatched(await connectPlayers('p', 2), '1v1');
		await joinUntilMatched(await connectPlayers('q', 4), '2v2');

		expect(requestedUrls()).toEqual([`${GAME_SERVICE_URL}/game`, `${GAME_SERVICE_URL}/game`]);
	});

	it('US-9-T-2 never sends a request to LobbyService', async () => {
		await joinUntilMatched(await connectPlayers('p', 6), '3v3');

		expect(requestedUrls().some((url) => url.startsWith(LOBBY_SERVICE_URL))).toBe(false);
	});
});

describe('US-9-T-2 GameService failures (criterion 11)', () => {
	it('US-9-T-2 sends game-start-failed to the players when GameService responds with an error', async () => {
		gameServiceFetch.mockImplementationOnce(() => Promise.resolve(gameServiceResponse(500, { error: 'boom' })));
		const players = await connectPlayers('p', 2);
		const errors = Promise.all(players.map((player) => nextEvent<{ code: string }>(player, 'queue:error')));
		joinAtOnce(players, '1v1');

		expect((await errors).map(({ code }) => code)).toEqual(['game-start-failed', 'game-start-failed']);
	});

	it('US-9-T-2 sends game-start-failed to the players when GameService is unreachable', async () => {
		gameServiceFetch.mockImplementationOnce(() => Promise.reject(new TypeError('fetch failed')));
		const players = await connectPlayers('p', 2);
		const errors = Promise.all(players.map((player) => nextEvent<{ code: string }>(player, 'queue:error')));
		joinAtOnce(players, '1v1');

		expect((await errors).map(({ code }) => code)).toEqual(['game-start-failed', 'game-start-failed']);
	});

	it('US-9-T-2 keeps the players waiting in the queue after GameService fails', async () => {
		gameServiceFetch.mockImplementationOnce(() => Promise.resolve(gameServiceResponse(500, { error: 'boom' })));
		const players = await connectPlayers('p', 2);
		const error = nextEvent(players[0], 'queue:error');
		joinAtOnce(players, '1v1');
		await error;
		await settle();

		expect(latestState(players[0])?.counts['1v1']).toBe(2);
	});

	it('US-9-T-2 puts the players back at the front of the queue in their original order', async () => {
		// First attempt fails; the newcomer's join retries with the original pair first.
		gameServiceFetch
			.mockImplementationOnce(() => Promise.resolve(gameServiceResponse(500, { error: 'boom' })))
			.mockImplementation(createdGame);
		const [first, second, newcomer] = await connectPlayers('p', 3);
		const error = nextEvent(first, 'queue:error');
		await joinQueue(first, '1v1');
		second.emit('queue:join', '1v1');
		await error;
		const matched = nextEvent(first, 'queue:matched');
		newcomer.emit('queue:join', '1v1');
		await matched;

		expect(gameRequests()[1].map(({ userId }) => userId)).toEqual(['p-0', 'p-1']);
	});
});
