-- ============================================================
-- Migration: Ajouter la colonne `image` à la table `messages`
-- 
-- Le schéma actuel de la table `messages` (créé par
-- djokko_sprint3.sql / djokko_sprint5.sql) ne contient pas
-- la colonne `image`, mais le code (chatModel.js, chatSocket.js)
-- tente d'y insérer le nom du fichier image lors de l'envoi
-- d'un message avec pièce jointe.
--
-- Exécutez cette commande dans phpMyAdmin (ou MySQL CLI)
-- pour corriger le problème.
-- ============================================================

-- Ajouter la colonne image après body (si elle n'existe pas déjà)
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS image VARCHAR(255) DEFAULT NULL AFTER body;

-- Si votre version de MySQL ne supporte pas `IF NOT EXISTS` pour ALTER TABLE,
-- utilisez plutôt cette approche :
-- SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS
--   WHERE TABLE_SCHEMA = 'djokko' AND TABLE_NAME = 'messages' AND COLUMN_NAME = 'image');
-- SET @sql := IF(@exist = 0,
--   'ALTER TABLE messages ADD COLUMN image VARCHAR(255) DEFAULT NULL AFTER body',
--   'SELECT 1');
-- PREPARE stmt FROM @sql;
-- EXECUTE stmt;
-- DEALLOCATE PREPARE stmt;

