-- Migration: Add login verification fields for 2FA
-- Description: Adds fields to support two-factor authentication during login

-- Add login verification fields to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS login_verification_code VARCHAR(6) DEFAULT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS login_verification_expires_at DATETIME DEFAULT NULL;

-- Optional: Add index for faster queries on verification code
CREATE INDEX IF NOT EXISTS idx_login_verification ON users(login_verification_code, login_verification_expires_at);

-- Description in French
-- Migration pour ajouter les champs de vérification de connexion 2FA
-- Ajoute login_verification_code et login_verification_expires_at à la table users