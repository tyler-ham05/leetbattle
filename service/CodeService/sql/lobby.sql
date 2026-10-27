\c code_service

CREATE TABLE IF NOT EXISTS anonymous_players (
  player_id UUID PRIMARY KEY,
  display_name TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lobby_members (
  player_id UUID PRIMARY KEY REFERENCES anonymous_players(player_id) ON DELETE CASCADE,
  team TEXT NOT NULL CHECK (team IN ('a', 'b')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS lobby_members_team_idx ON lobby_members (team);
