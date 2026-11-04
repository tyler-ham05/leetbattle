import type { Pool } from 'pg';
import { LobbyError } from './lobby-state';
import type { LobbyStore, TeamId } from './lobby-state';

const LOBBY_CAPACITY = 6;
const TEAM_CAPACITY = 3;
const MAIN_LOBBY_LOCK = 743219;

export class PostgresLobbyStore implements LobbyStore {
	private readonly pool: Pool;

	constructor(pool: Pool) {
		this.pool = pool;
	}

	async loadMembers(): Promise<{ userId: string; displayName: string; team: TeamId | null }[]> {
		const result = await this.pool.query<{ user_id: string; display_name: string; team: TeamId | null }>(
			'SELECT user_id, display_name, team FROM lobby_members ORDER BY joined_at, user_id',
		);
		return result.rows.map((row) => ({ userId: row.user_id, displayName: row.display_name, team: row.team }));
	}

	async addMember(userId: string, displayName: string): Promise<void> {
		const client = await this.pool.connect();
		try {
			await client.query('BEGIN');
			await client.query('SELECT pg_advisory_xact_lock($1)', [MAIN_LOBBY_LOCK]);
			const existing = await client.query('SELECT 1 FROM lobby_members WHERE user_id = $1', [userId]);
			if (existing.rowCount === 0) {
				const count = await client.query<{ count: string }>('SELECT COUNT(*)::text AS count FROM lobby_members');
				if (Number(count.rows[0]?.count) >= LOBBY_CAPACITY) {
					throw new LobbyError('lobby-full', 'The lobby is full.');
				}
				await client.query('INSERT INTO lobby_members (user_id, display_name) VALUES ($1, $2)', [userId, displayName]);
			} else {
				await client.query('UPDATE lobby_members SET display_name = $2 WHERE user_id = $1', [userId, displayName]);
			}
			await client.query('COMMIT');
		} catch (error) {
			await client.query('ROLLBACK');
			throw error;
		} finally {
			client.release();
		}
	}

	async removeMember(userId: string): Promise<void> {
		await this.pool.query('DELETE FROM lobby_members WHERE user_id = $1', [userId]);
	}

	async setName(userId: string, displayName: string): Promise<void> {
		await this.pool.query('UPDATE lobby_members SET display_name = $2 WHERE user_id = $1', [userId, displayName]);
	}

	async setTeam(userId: string, team: TeamId): Promise<void> {
		const client = await this.pool.connect();
		try {
			await client.query('BEGIN');
			await client.query('SELECT pg_advisory_xact_lock($1)', [MAIN_LOBBY_LOCK]);
			const member = await client.query('SELECT 1 FROM lobby_members WHERE user_id = $1', [userId]);
			if (member.rowCount === 0) throw new LobbyError('not-in-lobby', 'Join the lobby first.');
			const count = await client.query<{ count: string }>(
				'SELECT COUNT(*)::text AS count FROM lobby_members WHERE team = $1 AND user_id <> $2',
				[team, userId],
			);
			if (Number(count.rows[0]?.count) >= TEAM_CAPACITY) {
				throw new LobbyError('team-full', `Team ${team === 'a' ? '1' : '2'} is full.`);
			}
			await client.query('UPDATE lobby_members SET team = $2 WHERE user_id = $1', [userId, team]);
			await client.query('COMMIT');
		} catch (error) {
			await client.query('ROLLBACK');
			throw error;
		} finally {
			client.release();
		}
	}
}
