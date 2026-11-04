-- Run against the auth_service database. No seed data; just ensures a clean
-- slate when re-running schema.sql against an existing database (e.g. tests).
\c auth_service

TRUNCATE TABLE users CASCADE;
