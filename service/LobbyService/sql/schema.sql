-- Run against the lobby_service database.
\c lobby_service

CREATE TABLE IF NOT EXISTS lobby_members (
	user_id TEXT PRIMARY KEY,
	display_name VARCHAR(24) NOT NULL,
	team CHAR(1) CHECK (team IN ('a', 'b')),
	joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS lobby_members_team_idx ON lobby_members (team);
