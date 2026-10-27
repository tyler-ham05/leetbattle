import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { Request, Response } from 'express';
import type { PoolClient } from 'pg';
import { pool } from './db';

type Team = 'a' | 'b';

interface AnonymousPlayer {
	player_id: string;
	display_name: string;
	token_hash: string;
}

function bearerToken(req: Request): string | null {
	const authorization = req.header('authorization');
	if (!authorization?.startsWith('Bearer ')) {
		return null;
	}
	return authorization.slice('Bearer '.length);
}

function hashToken(token: string): string {
	return createHash('sha256').update(token).digest('hex');
}

async function findPlayer(req: Request): Promise<AnonymousPlayer | null> {
	const token = bearerToken(req);
	if (!token) {
		return null;
	}
	const result = await pool.query<AnonymousPlayer>(
		' SELECT player_id, display_name, token_hash FROM anonymous_players WHERE token_hash = $1',
		[hashToken(token)],
	);
	return result.rows[0] ?? null;
}

export async function createLobbySession(req: Request, res: Response) {
	try {
		const token = bearerToken(req);
		if (token) {
			const player = await findPlayer(req);
			if (player) {
				await pool.query(
					'UPDATE anonymous_players SET last_seen_at = NOW() WHERE player_id = $1',
					[player.player_id],
				);
				return res.json({
					playerId: player.player_id,
					displayName: player.display_name,
					token,
				});
			}
		}

		const playerId = randomUUID();
		const newToken = randomBytes(32).toString('base64url');
		const displayName = `Player ${playerId.slice(0, 4).toUpperCase()}`;
		await pool.query(
			'INSERT INTO anonymous_players (player_id, display_name, token_hash) VALUES ($1, $2, $3)',
			[playerId, displayName, hashToken(newToken)],
		);

		return res.status(201).json({
			playerId,
			displayName,
			token: newToken,
		});
	} catch (err) {
		console.error(err);
		return res.status(500).json({ error: 'failed to create lobby session' });
	}
}

export async function getLobby(req: Request, res: Response) {
	try {
		const player = await findPlayer(req);
		if (!player) {
			return res.status(401).json({ error: 'lobby session required' });
		}
		await pool.query(
			'UPDATE anonymous_players SET last_seen_at = NOW() WHERE player_id = $1',
			[player.player_id],
		);
		await pool.query(
			`DELETE FROM lobby_members m
			 USING anonymous_players p
			 WHERE p.player_id = m.player_id
			   AND p.last_seen_at < NOW() - INTERVAL '60 seconds'`,
		);

		const result = await pool.query<{
			player_id: string;
			display_name: string;
			team: Team;
			joined_at: string;
		}>(
			`SELECT p.player_id, p.display_name, m.team, m.joined_at
			 FROM lobby_members m
			 JOIN anonymous_players p ON p.player_id = m.player_id
			 ORDER BY m.joined_at ASC`,
		);

		return res.json({
			players: result.rows.map((row) => ({
				playerId: row.player_id,
				displayName: row.display_name,
				team: row.team,
			})),
			currentPlayerId: player.player_id,
		});
	} catch (err) {
		console.error(err);
		return res.status(500).json({ error: 'failed to load lobby' });
	}
}

export async function updateLobbyPlayerName(req: Request, res: Response) {
	try {
		const player = await findPlayer(req);
		if (!player) {
			return res.status(401).json({ error: 'lobby session required' });
		}

		const displayName = typeof req.body?.displayName === 'string'
			? req.body.displayName.trim()
			: '';
		if (displayName.length < 1 || displayName.length > 24) {
			return res.status(400).json({ error: 'name must be between 1 and 24 characters' });
		}

		await pool.query(
			'UPDATE anonymous_players SET display_name = $1, last_seen_at = NOW() WHERE player_id = $2',
			[displayName, player.player_id],
		);
		return res.json({ displayName });
	} catch (err) {
		console.error(err);
		return res.status(500).json({ error: 'failed to update player name' });
	}
}

export async function joinLobbyTeam(req: Request, res: Response) {
	let client: PoolClient | undefined;
	try {
		const player = await findPlayer(req);
		if (!player) {
			return res.status(401).json({ error: 'lobby session required' });
		}

		const team = req.body?.team as Team | undefined;
		if (team !== 'a' && team !== 'b') {
			return res.status(400).json({ error: 'team must be "a" or "b"' });
		}

		client = await pool.connect();
		await client.query('BEGIN');
		// Serialize team changes so concurrent joins cannot exceed the three-player limit.
		await client.query('SELECT pg_advisory_xact_lock(1040040)');
		const membership = await client.query<{ team: Team }>(
			'SELECT team FROM lobby_members WHERE player_id = $1',
			[player.player_id],
		);
		if (membership.rows[0]?.team === team) {
			await client.query('COMMIT');
			return res.json({ joined: true, team });
		}

		const count = await client.query<{ count: string }>(
			'SELECT COUNT(*) FROM lobby_members WHERE team = $1 AND player_id <> $2',
			[team, player.player_id],
		);
		if (Number(count.rows[0].count) >= 3) {
			await client.query('ROLLBACK');
			return res.status(409).json({ error: 'that team is full' });
		}

		await client.query(
			`INSERT INTO lobby_members (player_id, team)
			 VALUES ($1, $2)
			 ON CONFLICT (player_id) DO UPDATE SET team = EXCLUDED.team, joined_at = NOW()`,
			[player.player_id, team],
		);
		await client.query('COMMIT');
		return res.json({ joined: true, team });
	} catch (err) {
		if (client) await client.query('ROLLBACK').catch(() => undefined);
		console.error(err);
		return res.status(500).json({ error: 'failed to join team' });
	} finally {
		client?.release();
	}
}

export async function leaveLobby(req: Request, res: Response) {
	try {
		const player = await findPlayer(req);
		if (!player) {
			return res.status(401).json({ error: 'lobby session required' });
		}
		await pool.query('DELETE FROM lobby_members WHERE player_id = $1', [player.player_id]);
		return res.status(204).send();
	} catch (err) {
		console.error(err);
		return res.status(500).json({ error: 'failed to leave lobby' });
	}
}
