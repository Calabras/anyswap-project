-- lib/db/migrations/002_add_nickname.sql
-- Add nickname field to users table

ALTER TABLE users ADD COLUMN IF NOT EXISTS nickname VARCHAR(20) UNIQUE;

CREATE INDEX IF NOT EXISTS idx_users_nickname ON users(nickname);

