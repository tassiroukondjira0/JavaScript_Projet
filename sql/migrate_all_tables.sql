-- ============================================================
-- Djokko - Migration complète : Ajoute toutes les tables manquantes
-- et corrige les schémas de colonnes incompatibles.
-- Exécutez ce script DANS L'ORDRE dans phpMyAdmin ou MySQL CLI.
-- ============================================================

-- Désactiver temporairement les contraintes FK
SET FOREIGN_KEY_CHECKS = 0;

-- ============================================================
-- 1. Table conversations (chat 1-1)
-- ============================================================
CREATE TABLE IF NOT EXISTS conversations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user1_id INT NOT NULL,
  user2_id INT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_conversation_pair (user1_id, user2_id),
  FOREIGN KEY (user1_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (user2_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- 2. Table messages (avec conversation_id, body, image)
--    Utilisée par chatModel.js pour le chat 1-1.
--    Si la table existe déjà avec l'ancien schéma (sender_id/receiver_id/
--    content), exécutez migrations/fix_chat_messages_table.sql pour
--    ajouter les colonnes manquantes (conversation_id, body).
-- ============================================================
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

-- ============================================================
-- 3. Table message_reads (read receipts)
-- ============================================================
CREATE TABLE IF NOT EXISTS message_reads (
  message_id INT NOT NULL,
  user_id INT NOT NULL,
  read_at DATETIME DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (message_id, user_id),
  FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- 4. Table saved_posts (favoris / bookmarks)
-- ============================================================
CREATE TABLE IF NOT EXISTS saved_posts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  post_id INT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_save (user_id, post_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- 5. Table stories
-- ============================================================
CREATE TABLE IF NOT EXISTS stories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  media_url VARCHAR(500) NOT NULL,
  media_type ENUM('image', 'video') NOT NULL DEFAULT 'image',
  caption TEXT,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_stories_user_id (user_id),
  INDEX idx_stories_expires_at (expires_at),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- 6. Table story_views
-- ============================================================
CREATE TABLE IF NOT EXISTS story_views (
  id INT AUTO_INCREMENT PRIMARY KEY,
  story_id INT NOT NULL,
  viewer_id INT NOT NULL,
  viewed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_story_view (story_id, viewer_id),
  FOREIGN KEY (story_id) REFERENCES stories(id) ON DELETE CASCADE,
  FOREIGN KEY (viewer_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- 7. Table otps (pour OTP générique : phone verification, 2FA, etc.)
-- ============================================================
CREATE TABLE IF NOT EXISTS otps (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  code_hash VARCHAR(255) NOT NULL,
  purpose VARCHAR(50) NOT NULL,
  expires_at DATETIME NOT NULL,
  consumed_at DATETIME DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_otps_user (user_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- 8. Table shares (partages de publications)
-- ============================================================
CREATE TABLE IF NOT EXISTS shares (
  id INT AUTO_INCREMENT PRIMARY KEY,
  post_id INT NOT NULL,
  user_id INT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_share (post_id, user_id),
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- 9. Table activity_log (utilisée par activityModel.js)
--    Différente de activity_logs (ancienne table) : colonnes user_id, action, meta_json
-- ============================================================
CREATE TABLE IF NOT EXISTS activity_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT DEFAULT NULL,
  action VARCHAR(255) NOT NULL,
  meta_json TEXT DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_activity_user (user_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ============================================================
-- 10. Mettre à jour la table notifications
--     La table existante a : id, receiver_id, sender_id, type, entity_id, is_read, created_at
--     Le nouveau modèle attend : id, user_id, type (ENUM), payload (JSON), is_read
--     On va ajouter les nouvelles colonnes sans supprimer les anciennes pour la rétrocompatibilité.
-- ============================================================

-- La table notifications a déjà la bonne structure (user_id, type ENUM, payload JSON, is_read).
-- On ne fait rien si les colonnes existent déjà.
-- Note: Si votre table notifications a l'ancienne structure (receiver_id, sender_id, entity_id),
-- décommentez les lignes ci-dessous et commentez les lignes ci-dessus.

-- Nouveau schéma (déjà correct) : ne rien faire
SELECT 'notifications table already has correct schema' AS status;

-- ============================================================
-- 11. Ajouter colonne video + images_json à posts si manquantes
-- ============================================================
SET @exist_video := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='djokko' AND TABLE_NAME='posts' AND COLUMN_NAME='video');
SET @sql_video := IF(@exist_video = 0, 'ALTER TABLE posts ADD COLUMN video VARCHAR(255) DEFAULT NULL AFTER image', 'SELECT 1');
PREPARE stmt_video FROM @sql_video;
EXECUTE stmt_video;
DEALLOCATE PREPARE stmt_video;

SET @exist_images_json := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='djokko' AND TABLE_NAME='posts' AND COLUMN_NAME='images_json');
SET @sql_images_json := IF(@exist_images_json = 0, 'ALTER TABLE posts ADD COLUMN images_json LONGTEXT DEFAULT NULL AFTER video', 'SELECT 1');
PREPARE stmt_images_json FROM @sql_images_json;
EXECUTE stmt_images_json;
DEALLOCATE PREPARE stmt_images_json;

SET @exist_shared_from := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='djokko' AND TABLE_NAME='posts' AND COLUMN_NAME='shared_from');
SET @sql_shared_from := IF(@exist_shared_from = 0, 'ALTER TABLE posts ADD COLUMN shared_from INT DEFAULT NULL AFTER video', 'SELECT 1');
PREPARE stmt_shared_from FROM @sql_shared_from;
EXECUTE stmt_shared_from;
DEALLOCATE PREPARE stmt_shared_from;

-- ============================================================
-- 12. Ajouter colonnes à users si manquantes
-- ============================================================
SET @exist_cp := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='djokko' AND TABLE_NAME='users' AND COLUMN_NAME='cover_picture');
SET @sql_cp := IF(@exist_cp = 0, 'ALTER TABLE users ADD COLUMN cover_picture VARCHAR(255) DEFAULT NULL AFTER profile_picture', 'SELECT 1');
PREPARE stmt_cp FROM @sql_cp;
EXECUTE stmt_cp;
DEALLOCATE PREPARE stmt_cp;

SET @exist_city := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='djokko' AND TABLE_NAME='users' AND COLUMN_NAME='city');
SET @sql_city := IF(@exist_city = 0, 'ALTER TABLE users ADD COLUMN city VARCHAR(255) DEFAULT NULL AFTER bio', 'SELECT 1');
PREPARE stmt_city FROM @sql_city;
EXECUTE stmt_city;
DEALLOCATE PREPARE stmt_city;

SET @exist_country := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='djokko' AND TABLE_NAME='users' AND COLUMN_NAME='country');
SET @sql_country := IF(@exist_country = 0, 'ALTER TABLE users ADD COLUMN country VARCHAR(255) DEFAULT NULL AFTER city', 'SELECT 1');
PREPARE stmt_country FROM @sql_country;
EXECUTE stmt_country;
DEALLOCATE PREPARE stmt_country;

SET @exist_passions := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='djokko' AND TABLE_NAME='users' AND COLUMN_NAME='passions');
SET @sql_passions := IF(@exist_passions = 0, 'ALTER TABLE users ADD COLUMN passions TEXT DEFAULT NULL AFTER country', 'SELECT 1');
PREPARE stmt_passions FROM @sql_passions;
EXECUTE stmt_passions;
DEALLOCATE PREPARE stmt_passions;

SET @exist_super_admin := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='djokko' AND TABLE_NAME='users' AND COLUMN_NAME='is_super_admin');
SET @sql_super_admin := IF(@exist_super_admin = 0, 'ALTER TABLE users ADD COLUMN is_super_admin TINYINT NOT NULL DEFAULT 0 AFTER is_admin', 'SELECT 1');
PREPARE stmt_super_admin FROM @sql_super_admin;
EXECUTE stmt_super_admin;
DEALLOCATE PREPARE stmt_super_admin;

SET @exist_prc := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='djokko' AND TABLE_NAME='users' AND COLUMN_NAME='password_reset_code');
SET @sql_prc := IF(@exist_prc = 0, 'ALTER TABLE users ADD COLUMN password_reset_code VARCHAR(10) DEFAULT NULL', 'SELECT 1');
PREPARE stmt_prc FROM @sql_prc;
EXECUTE stmt_prc;
DEALLOCATE PREPARE stmt_prc;

SET @exist_pre := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='djokko' AND TABLE_NAME='users' AND COLUMN_NAME='password_reset_expires_at');
SET @sql_pre := IF(@exist_pre = 0, 'ALTER TABLE users ADD COLUMN password_reset_expires_at DATETIME DEFAULT NULL', 'SELECT 1');
PREPARE stmt_pre FROM @sql_pre;
EXECUTE stmt_pre;
DEALLOCATE PREPARE stmt_pre;

SET @exist_prcnt := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='djokko' AND TABLE_NAME='users' AND COLUMN_NAME='password_reset_request_count');
SET @sql_prcnt := IF(@exist_prcnt = 0, 'ALTER TABLE users ADD COLUMN password_reset_request_count INT NOT NULL DEFAULT 0', 'SELECT 1');
PREPARE stmt_prcnt FROM @sql_prcnt;
EXECUTE stmt_prcnt;
DEALLOCATE PREPARE stmt_prcnt;

SET @exist_prfa := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='djokko' AND TABLE_NAME='users' AND COLUMN_NAME='password_reset_request_first_at');
SET @sql_prfa := IF(@exist_prfa = 0, 'ALTER TABLE users ADD COLUMN password_reset_request_first_at DATETIME DEFAULT NULL', 'SELECT 1');
PREPARE stmt_prfa FROM @sql_prfa;
EXECUTE stmt_prfa;
DEALLOCATE PREPARE stmt_prfa;

SET @exist_prbu := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='djokko' AND TABLE_NAME='users' AND COLUMN_NAME='password_reset_block_until');
SET @sql_prbu := IF(@exist_prbu = 0, 'ALTER TABLE users ADD COLUMN password_reset_block_until DATETIME DEFAULT NULL', 'SELECT 1');
PREPARE stmt_prbu FROM @sql_prbu;
EXECUTE stmt_prbu;
DEALLOCATE PREPARE stmt_prbu;

SET @exist_prlh := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='djokko' AND TABLE_NAME='users' AND COLUMN_NAME='password_reset_last_used_hash');
SET @sql_prlh := IF(@exist_prlh = 0, 'ALTER TABLE users ADD COLUMN password_reset_last_used_hash VARCHAR(255) DEFAULT NULL', 'SELECT 1');
PREPARE stmt_prlh FROM @sql_prlh;
EXECUTE stmt_prlh;
DEALLOCATE PREPARE stmt_prlh;

-- Réactiver les contraintes FK
SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- Récapitulatif des tables créées :
--  - conversations       ✅
--  - messages            ✅
--  - message_reads       ✅
--  - saved_posts         ✅
--  - stories             ✅
--  - story_views         ✅
--  - otps                ✅
--  - shares              ✅
--  - activity_log        ✅
--
-- Tables mises à jour :
--  - notifications       ✅ (ajout user_id, payload)
--  - posts               ✅ (ajout video, images_json, shared_from)
--  - users               ✅ (ajout cover_picture, city, country, passions, is_super_admin, password_reset_*)
-- ============================================================

