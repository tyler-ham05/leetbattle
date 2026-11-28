// US-7-T-2: Ladder matchmaking queues: stress tests (QueueService)
// Backs up the switching, leaving, joining-at-once and GameService-failure criteria.
//   - 20 players join 1v1 at once -> 10 games, nobody in two games
//   - 30 players across 1v1/2v2/3v3 at once -> 9 games, all teams balanced
//   - slow GameService: players joining mid-request aren't counted twice
//   - a stuck 1v1 request doesn't block a 2v2 match
//   - 30 rapid queue switches -> waiting only in the last queue
//   - 100 join/leave pairs -> no game created
//   - every GameService call fails -> all 6 players still queued
import { describe, expect, it } from 'vitest';
import {
	connectPlayers,
	createdGame,
	everyMatchedUserId,
	gameRequests,
	gameServiceFetch,
	gameServiceResponse,
	joinAtOnce,
	joinQueue,
	latestState,
	nextEvent,
	nextState,
	settle,
	userIds,
} from './helpers';
import type { QueueMode } from './helpers';

function slowGameService(ms: number) {
	return () => new Promise<Response>((resolve) => setTimeout(() => void createdGame().then(resolve), ms));
}

describe('US-7-T-2 stress: many players joining at once', () => {
	it('US-7-T-2 S1 creates 10 games when 20 players join the 1v1 queue at once', async () => {
		joinAtOnce(await connectPlayers('p', 20), '1v1');
		await settle(1_000);

		expect(gameServiceFetch).toHaveBeenCalledTimes(10);
	});

	it('US-7-T-2 S2 puts each of 20 players joining the 1v1 queue at once in exactly one game', async () => {
		joinAtOnce(await connectPlayers('p', 20), '1v1');
		await settle(1_000);

		expect(everyMatchedUserId()).toEqual(userIds('p', 20));
	});

	it('US-7-T-2 S3 creates 9 games when 30 players join all three queues at once', async () => {
		const [ones, twos, threes] = await Promise.all([
			connectPlayers('one', 10),
			connectPlayers('two', 8),
			connectPlayers('three', 12),
		]);
		joinAtOnce(ones, '1v1');
		joinAtOnce(twos, '2v2');
		joinAtOnce(threes, '3v3');
		await settle(1_000);

		expect(gameServiceFetch).toHaveBeenCalledTimes(9);
	});

	it('US-7-T-2 S4 gives every game from all three queues two teams of the same size', async () => {
		const [ones, twos, threes] = await Promise.all([
			connectPlayers('one', 10),
			connectPlayers('two', 8),
			connectPlayers('three', 12),
		]);
		joinAtOnce(ones, '1v1');
		joinAtOnce(twos, '2v2');
		joinAtOnce(threes, '3v3');
		await settle(1_000);
		// "<team a size>v<team b size>" per game, sorted.
		const shapes = gameRequests()
			.map((players) => `${players.filter(({ team }) => team === 'a').length}v${players.filter(({ team }) => team === 'b').length}`)
			.sort();

		expect(shapes).toEqual(['1v1', '1v1', '1v1', '1v1', '1v1', '2v2', '2v2', '3v3', '3v3']);
	});
});

describe('US-7-T-2 stress: a slow GameService', () => {
	it('US-7-T-2 S5 does not count players twice when more join while a match is being created', async () => {
		gameServiceFetch.mockImplementation(slowGameService(200));
		const players = await connectPlayers('p', 4);
		// Second pair joins while the first pair's request is still open.
		joinAtOnce(players.slice(0, 2), '1v1');
		await settle(50);
		joinAtOnce(players.slice(2), '1v1');
		await settle(1_000);

		expect(everyMatchedUserId()).toEqual(userIds('p', 4));
	});

	it('US-7-T-2 S6 starts a 2v2 match while a 1v1 match is still waiting on GameService', async () => {
		// The 1v1 request never answers.
		gameServiceFetch
			.mockImplementationOnce(() => new Promise<Response>(() => undefined))
			.mockImplementation(createdGame);
		const [ones, twos] = await Promise.all([connectPlayers('one', 2), connectPlayers('two', 4)]);
		joinAtOnce(ones, '1v1');
		await settle(50);
		const matched = nextEvent<{ gameId: string }>(twos[0], 'queue:matched');
		joinAtOnce(twos, '2v2');

		expect((await matched).gameId).toBe('game-1');
	});
});

describe('US-7-T-2 stress: switching and leaving over and over', () => {
	const MODES: QueueMode[] = ['1v1', '2v2', '3v3'];

	it('US-7-T-2 S7 leaves a player who switches queues 30 times waiting in the last one', async () => {
		const [player] = await connectPlayers('p', 1);
		// The 30th join is 3v3.
		for (let i = 0; i < 30; i += 1) player.emit('queue:join', MODES[i % 3]);
		await settle();

		expect(latestState(player)?.queue).toBe('3v3');
	});

	it('US-7-T-2 S8 counts a player who switched queues 30 times in exactly one queue', async () => {
		const [player] = await connectPlayers('p', 1);
		for (let i = 0; i < 30; i += 1) player.emit('queue:join', MODES[i % 3]);
		await settle();
		const counts = latestState(player)?.counts;

		expect(counts).toEqual({ '1v1': 0, '2v2': 0, '3v3': 1 });
	});

	it('US-7-T-2 S9 creates no game when 10 players join and leave the 1v1 queue 10 times each', async () => {
		const players = await connectPlayers('p', 10);
		// One player at a time: concurrent churn could legitimately match two players.
		for (let round = 0; round < 10; round += 1) {
			for (const player of players) {
				await joinQueue(player, '1v1');
				const left = nextState(player, (state) => state.queue === null);
				player.emit('queue:leave');
				await left;
			}
		}
		await settle();

		expect(gameServiceFetch).not.toHaveBeenCalled();
	});
});

describe('US-7-T-2 stress: GameService failing under load', () => {
	it('US-7-T-2 S10 keeps all 6 players queued when every GameService call fails', async () => {
		gameServiceFetch.mockImplementation(() => Promise.resolve(gameServiceResponse(500, { error: 'boom' })));
		const players = await connectPlayers('p', 6);
		joinAtOnce(players, '1v1');
		await settle(1_000);

		expect(latestState(players[0])?.counts['1v1']).toBe(6);
	});
});
