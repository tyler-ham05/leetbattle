-- Run against the code_service database (psql -d code_service -f schema.sql).
\c code_service

CREATE TABLE IF NOT EXISTS problems (
  task_id              TEXT PRIMARY KEY,
  question_id          INTEGER NOT NULL UNIQUE,
  difficulty           TEXT NOT NULL CHECK (difficulty IN ('Easy', 'Medium', 'Hard')),
  tags                 TEXT[] NOT NULL DEFAULT '{}',
  problem_description  TEXT NOT NULL,
  starter_code         TEXT NOT NULL,
  estimated_date       TIMESTAMP,
  prompt               TEXT,
  completion           TEXT,
  entry_point          TEXT,
  test                 TEXT,
  input_output         JSONB,
  query                TEXT,
  response             TEXT
);

CREATE INDEX IF NOT EXISTS problems_difficulty_idx ON problems (difficulty);
CREATE INDEX IF NOT EXISTS problems_tags_idx ON problems USING GIN (tags);
