-- Run against the auth_service database. No seed data; just ensures a clean
-- slate when re-running schema.sql against an existing database (e.g. tests).
\c auth_service

TRUNCATE TABLE email_verification_tokens, password_reset_tokens, users CASCADE;
