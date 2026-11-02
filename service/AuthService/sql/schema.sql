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
