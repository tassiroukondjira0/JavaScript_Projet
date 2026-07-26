-- ============================================================
-- Migration: Fix chat messages table structure
-- Problem: The `messages` table may have the OLD schema (from schema.sql)
--   with columns: sender_id, receiver_id, content, image, is_read, read_at
--   but chatModel.js expects: conversation_id, sender_id, body, image
--
-- Also: migrate_all_tables.sql created a `chat_messages` table (not `messages`)
--   which the code never uses. This migration fixes everything.
--
-- Run this AFTER schema.sql and/or migrate_all_tables.sql
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;

-- ------------------------------------------------------------
-- 1. Ensure `messages` table exists with the correct schema
--    If it doesn't exist at all, create it properly.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  conversation_id INT NOT NULL,
  sender_id INT NOT NULL,
  body TEXT NOT NULL,
  image VARCHAR(255) DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_messages_conversation (conversation_id),
  INDEX idx_messages_sender (sender_id)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 2. If `messages` already existed with the OLD schema, add the
--    missing columns. IF NOT EXISTS prevents errors if they
--    were already added by a previous run.
-- ------------------------------------------------------------
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS conversation_id INT NOT NULL DEFAULT 0 AFTER sender_id,
  ADD COLUMN IF NOT EXISTS body TEXT AFTER conversation_id,
  ADD COLUMN IF NOT EXISTS image VARCHAR(255) DEFAULT NULL AFTER body;

-- ------------------------------------------------------------
-- 3. Copy any existing data from `content` → `body` if the old
--    `content` column still exists and `body` is empty.
-- ------------------------------------------------------------
SET @has_content = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'messages'
    AND COLUMN_NAME = 'content'
);

SET @has_body = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'messages'
    AND COLUMN_NAME = 'body'
);

-- Only copy if both columns exist
SET @copy_sql = IF(@has_content > 0 AND @has_body > 0,
  'UPDATE messages SET body = content WHERE body IS NULL OR body = ''''',
  'SELECT 1'
);
PREPARE stmt FROM @copy_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ------------------------------------------------------------
-- 4. Drop the unused `chat_messages` table (created by
--    migrate_all_tables.sql but never referenced by the code).
-- ------------------------------------------------------------
DROP TABLE IF EXISTS chat_messages;

-- ------------------------------------------------------------
-- 5. Drop and recreate `message_reads` with the correct FK
--    referencing `messages` (not `chat_messages`).
--    This is needed because migrate_all_tables.sql created it
--    with a FK to `chat_messages`.
-- ------------------------------------------------------------
DROP TABLE IF EXISTS message_reads;

CREATE TABLE message_reads (
  message_id INT NOT NULL,
  user_id INT NOT NULL,
  read_at DATETIME DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (message_id, user_id),
  FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 6. Ensure `conversations` table exists (required by chatModel)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS conversations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user1_id INT NOT NULL,
  user2_id INT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_conversation_pair (user1_id, user2_id),
  FOREIGN KEY (user1_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (user2_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- Summary of changes:
--   - messages table now has: conversation_id, sender_id, body, image
--   - chat_messages table dropped (was unused by code)
--   - message_reads FK now references messages (not chat_messages)
--   - conversations table ensured to exist
-- ============================================================
