-- Djokko - Reset complet des données
-- Ce script supprime TOUTES les données mais garde la structure des tables
-- A utiliser pour réinitialiser la base comme si c'était une nouvelle installation

SET FOREIGN_KEY_CHECKS = 0;

TRUNCATE TABLE users;
TRUNCATE TABLE password_reset_otps;
TRUNCATE TABLE activity_logs;
TRUNCATE TABLE reports;
TRUNCATE TABLE notifications;
TRUNCATE TABLE messages;
TRUNCATE TABLE friends;
TRUNCATE TABLE reactions;
TRUNCATE TABLE likes;
TRUNCATE TABLE comments;
TRUNCATE TABLE posts;

SET FOREIGN_KEY_CHECKS = 1;

-- Réinsérer les utilisateurs par défaut
INSERT INTO users (fullname, email, password, is_admin, status, phone_verified, preferred_language, preferred_theme) VALUES
('Administrateur', 'admin@djokko.com', '$2b$12$LQv3c1yqNwkR6A6w6Q6BHe6PCsQZ6x6M6xQZ6x6M6xQZ6x6M6xQ6', 1, 'active', 1, 'fr', 'dark');

INSERT INTO users (fullname, email, password, status, phone_verified, preferred_language, preferred_theme) VALUES
('Utilisateur Test', 'test@djokko.com', '$2b$12$LQv3c1yqNwkR6A6w6Q6BHe6PCsQZ6x6M6xQZ6x6M6xQZ6x6M6xQ6', 'active', 1, 'fr', 'dark');