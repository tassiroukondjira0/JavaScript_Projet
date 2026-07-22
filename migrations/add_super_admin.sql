-- Adds Super Administrator role
-- Super Admin has higher privileges than Admin.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS is_super_admin TINYINT NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_users_is_super_admin ON users(is_super_admin);

