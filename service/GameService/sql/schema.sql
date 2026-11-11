\c game_service

CREATE TABLE IF NOT EXISTS game (
  game_id  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  t1_score   INT NOT NULL DEFAULT 0,
  t2_score   INT NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at   TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS players (
  game_id      uuid NOT NULL REFERENCES game (game_id),
  user_id      uuid NOT NULL,
  display_name VARCHAR(24) NOT NULL DEFAULT 'unknown',
  PRIMARY KEY (game_id, user_id)
);

-- Which team a player is on. Split out from `players` since team is
-- per-match, not a property of the player row itself.
CREATE TABLE IF NOT EXISTS player_teams (
  game_id uuid NOT NULL,
  user_id uuid NOT NULL,
  team    CHAR(1) NOT NULL CHECK (team IN ('a', 'b')),
  PRIMARY KEY (game_id, user_id),
  FOREIGN KEY (game_id, user_id) REFERENCES players (game_id, user_id)
);

-- The shared problem pool assigned to a match (both teams pick from the
-- same set). task_id references CodeService's problems.task_id by value
-- only -- different database, no real FK across them.
CREATE TABLE IF NOT EXISTS game_problems (
  game_id uuid NOT NULL REFERENCES game (game_id),
  task_id TEXT NOT NULL,
  PRIMARY KEY (game_id, task_id)
);

-- Which problem each player is currently working on. One active pick per
-- player; they can switch, which just updates this row.
CREATE TABLE IF NOT EXISTS player_selections (
  game_id     uuid NOT NULL,
  user_id     uuid NOT NULL,
  task_id     TEXT NOT NULL,
  selected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (game_id, user_id),
  FOREIGN KEY (game_id, user_id) REFERENCES player_teams (game_id, user_id),
  FOREIGN KEY (game_id, task_id) REFERENCES game_problems (game_id, task_id)
);

-- Scoring history: every submission attempt against a problem. t1_score /
-- t2_score on `game` are a cache of the totals here and must be kept in
-- sync by application code when a submission is scored.
CREATE TABLE IF NOT EXISTS submissions (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id           uuid NOT NULL,
  user_id           uuid NOT NULL,
  task_id           TEXT NOT NULL,
  test_cases_passed INTEGER NOT NULL,
  test_cases_total  INTEGER NOT NULL,
  points_awarded    INTEGER NOT NULL,
  submitted_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (game_id, user_id) REFERENCES player_teams (game_id, user_id)
);

CREATE INDEX IF NOT EXISTS submissions_game_user_idx ON submissions (game_id, user_id);
CREATE INDEX IF NOT EXISTS submissions_game_task_idx ON submissions (game_id, task_id);
