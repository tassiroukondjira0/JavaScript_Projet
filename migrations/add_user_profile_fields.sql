-- Migration: Champs profil utilisateur + sécurité de connexion
-- Description: Ajoute prénom/nom, nom d'utilisateur, statut de compte,
-- et le verrouillage temporaire après échecs de connexion.

ALTER TABLE users
  ADD COLUMN first_name VARCHAR(120) AFTER fullname,
  ADD COLUMN last_name VARCHAR(120) AFTER first_name,
  ADD COLUMN username VARCHAR(30) UNIQUE AFTER last_name,
  ADD COLUMN status VARCHAR(20) DEFAULT 'pending' AFTER phone_verification_expires_at,
  ADD COLUMN failed_login_attempts INT DEFAULT 0 AFTER status,
  ADD COLUMN locked_until DATETIME AFTER failed_login_attempts;

-- Index pour accélérer la connexion par email/username
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

-- Note : pour passer un compte en "actif" après vérification OTP,
-- le champ status est mis à 'active' par le backend.