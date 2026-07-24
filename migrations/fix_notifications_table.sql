-- ============================================================
-- Migration: Fix notifications table structure
-- Problem: notificationModel.js uses `user_id` and `payload`
--   columns, but the OLD schema (from schema.sql) only has:
--   receiver_id, sender_id, type, entity_id, is_read, created_at
--
-- Run this AFTER schema.sql (if the notifications table already exists)
-- or as a standalone fix.
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;

-- ------------------------------------------------------------
-- 1. Ensure `notifications` table exists with correct columns
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT DEFAULT NULL,
  receiver_id INT DEFAULT NULL,
  sender_id INT DEFAULT NULL,
  type VARCHAR(50) NOT NULL,
  payload TEXT DEFAULT NULL,
  entity_id INT DEFAULT NULL,
  is_read TINYINT DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_notifications_user_id (user_id),
  INDEX idx_notifications_receiver_id (receiver_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 2. If table already existed, add missing columns
-- ------------------------------------------------------------
ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS user_id INT DEFAULT NULL AFTER id,
  ADD COLUMN IF NOT EXISTS payload TEXT DEFAULT NULL AFTER type;

-- ------------------------------------------------------------
-- 3. Migrate existing data: receiver_id -> user_id
-- ------------------------------------------------------------
UPDATE notifications SET user_id = receiver_id
WHERE user_id IS NULL AND receiver_id IS NOT NULL;

-- ------------------------------------------------------------
-- 4. Migrate existing data: sender_id/entity_id -> payload
-- ------------------------------------------------------------
UPDATE notifications SET payload = CONCAT('{"sender_id":', COALESCE(sender_id, 'null'), ',"entity_id":', COALESCE(entity_id, 'null'), '}')
WHERE (payload IS NULL OR payload = '') AND (sender_id IS NOT NULL OR entity_id IS NOT NULL);

-- ------------------------------------------------------------
-- 5. Add index on user_id if not exists
-- ------------------------------------------------------------
ALTER TABLE notifications
  ADD INDEX IF NOT EXISTS idx_notifications_user_id (user_id);

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- Summary:
--   - notifications table now has user_id and payload columns
--   - Existing data migrated from receiver_id/sender_id/entity_id
-- ============================================================
