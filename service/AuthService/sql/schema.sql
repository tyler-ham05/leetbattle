-- Run against the auth_service database (psql -d auth_service -f schema.sql).
\c auth_service

CREATE TABLE IF NOT EXISTS users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email           TEXT NOT NULL UNIQUE,
  sub             TEXT, -- if we want to add google later
  password_hash   TEXT NOT NULL,
  name            TEXT,
  email_verified  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  games_played    INT DEFAULT 0,
  games_won       INT DEFAULT 0
);

-- Outstanding "forgot password" links. Only the SHA-256 of the token is kept;
-- the row is deleted when the link is used.
CREATE TABLE IF NOT EXISTS password_resets (
  token_hash  TEXT PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  expires_at  TIMESTAMPTZ NOT NULL
);

-- US-5-T-13: when the password was last reset or changed. Session tokens
-- issued before it are signed out. NULL means it was never changed.
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMPTZ;

-- US-5-T-13: one account per email, whatever its case.
CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower ON users (lower(email));

-- US-7-T-1: each player's rating (everyone starts at 50, in Bronze I) and
-- their match record. Draws are games_played - games_won - games_lost.
ALTER TABLE users ADD COLUMN IF NOT EXISTS rating INT NOT NULL DEFAULT 50;
-- A database that already has the column (with the earlier default of 100)
-- starts new players at 50 too.
ALTER TABLE users ALTER COLUMN rating SET DEFAULT 50;
ALTER TABLE users ADD COLUMN IF NOT EXISTS games_lost INT NOT NULL DEFAULT 0;
