// US-10-T-10: team names on queue:matched. Pseudocode: test/matched-teams-test-pseudo.md.
import { describe, expect, it } from 'vitest';
import { connectPlayers, joinUntilMatched, settle, gameServiceFetch, gameServiceResponse } from './helpers';
import type { QueueMode } from './helpers';

// connectUser gives each player the display name `Player <userId>`.
const nameOf = (prefix: string, index: number) => `Player ${prefix}-${index}`;
const names = (prefix: string, from: number, to: number) =>
	Array.from({ length: to - from }, (_, i) => nameOf(prefix, from + i));

// Connects `count` players, joins them in order, and returns every matched payload (index = join order).
async function match(mode: QueueMode, count: number) {
	const players = await connectPlayers('p', count);
	return joinUntilMatched(players, mode);
}

describe('queue:matched team names (US-10-T-10)', () => {
	describe('own team (yourTeam)', () => {
		it('1v1: the first player gets only their own name as yourTeam', async () => {
			// Two players fill a 1v1; player 0 is team a alone.
			const matched = await match('1v1', 2);
			expect(matched[0].yourTeam).toEqual([nameOf('p', 0)]);
		});

		it('2v2: a team-a player gets both team-a names in queue order', async () => {
			// Players 0 and 1 are team a; player 0 checks the team list.
			const matched = await match('2v2', 4);
			expect(matched[0].yourTeam).toEqual(names('p', 0, 2));
		});

		it('3v3: a team-a player gets all three team-a names in queue order', async () => {
			const matched = await match('3v3', 6);
			expect(matched[0].yourTeam).toEqual(names('p', 0, 3));
		});

		it('the receiving player own name is included in their yourTeam', async () => {
			// Player 1 (second on team a) must see themself in the list.
			const matched = await match('2v2', 4);
			expect(matched[1].yourTeam).toContain(nameOf('p', 1));
		});

		it('2v2: a team-b player gets both team-b names in queue order', async () => {
			// Players 2 and 3 are team b; player 3 checks.
			const matched = await match('2v2', 4);
			expect(matched[3].yourTeam).toEqual(names('p', 2, 4));
		});
	});

	describe('rivals', () => {
		it('1v1: the first player gets the second player as the only rival', async () => {
			const matched = await match('1v1', 2);
			expect(matched[0].rivals).toEqual([nameOf('p', 1)]);
		});

		it('2v2: a team-a player gets both team-b names in queue order', async () => {
			const matched = await match('2v2', 4);
			expect(matched[0].rivals).toEqual(names('p', 2, 4));
		});

		it('3v3: a team-a player gets all three team-b names in queue order', async () => {
			const matched = await match('3v3', 6);
			expect(matched[0].rivals).toEqual(names('p', 3, 6));
		});

		it('2v2: a team-b player gets both team-a names in queue order', async () => {
			const matched = await match('2v2', 4);
			expect(matched[3].rivals).toEqual(names('p', 0, 2));
		});

		it('the receiving player own name does not appear in their rivals', async () => {
			const matched = await match('2v2', 4);
			expect(matched[0].rivals).not.toContain(nameOf('p', 0));
		});
	});

	describe('sizes', () => {
		it('1v1: yourTeam has 1 name', async () => {
			const matched = await match('1v1', 2);
			expect(matched[0].yourTeam).toHaveLength(1);
		});

		it('1v1: rivals has 1 name', async () => {
			const matched = await match('1v1', 2);
			expect(matched[0].rivals).toHaveLength(1);
		});

		it('2v2: yourTeam has 2 names', async () => {
			const matched = await match('2v2', 4);
			expect(matched[0].yourTeam).toHaveLength(2);
		});

		it('2v2: rivals has 2 names', async () => {
			const matched = await match('2v2', 4);
			expect(matched[0].rivals).toHaveLength(2);
		});

		it('3v3: yourTeam has 3 names', async () => {
			const matched = await match('3v3', 6);
			expect(matched[0].yourTeam).toHaveLength(3);
		});

		it('3v3: rivals has 3 names', async () => {
			const matched = await match('3v3', 6);
			expect(matched[0].rivals).toHaveLength(3);
		});
	});

	describe('existing behaviour', () => {
		it('every matched player still gets the same gameId GameService returned', async () => {
			// The stub answers "game-1" for the first (only) match.
			const matched = await match('2v2', 4);
			expect(matched.map((payload) => payload.gameId)).toEqual(Array(4).fill('game-1'));
		});

		it('when GameService fails, no player receives queue:matched', async () => {
			// Make GameService answer 500, then fill a 1v1 and watch for any matched event.
			gameServiceFetch.mockImplementation(() => Promise.resolve(gameServiceResponse(500, { error: 'boom' })));
			const players = await connectPlayers('f', 2);
			let received = 0;
			for (const player of players) player.on('queue:matched', () => { received += 1; });
			for (const player of players) player.emit('queue:join', '1v1');
			await settle();
			expect(received).toBe(0);
		});
	});
});
