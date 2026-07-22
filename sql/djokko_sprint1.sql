-- Djokko — Sprint 1 (Auth + OTP + rôles + journal d’activité)

CREATE DATABASE IF NOT EXISTS djokko CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE djokko;

-- Users
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  fullname VARCHAR(120) NOT NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  age INT NOT NULL,
  role ENUM('USER','ADMIN','SUPER_ADMIN') NOT NULL DEFAULT 'USER',
  profile_picture VARCHAR(255) NULL,
  cover_picture VARCHAR(255) NULL,
  bio TEXT NULL,
  city VARCHAR(120) NULL,
  country VARCHAR(120) NULL,
  preferred_language VARCHAR(100) NULL,
  preferred_theme VARCHAR(10) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- OTPs
CREATE TABLE IF NOT EXISTS otps (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  code_hash CHAR(64) NOT NULL,
  purpose ENUM('REGISTER','LOGIN','PASSWORD_RESET') NOT NULL,
  expires_at DATETIME NOT NULL,
  consumed_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_otps_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX (user_id),
  INDEX (purpose),
  INDEX (expires_at)
);

-- Activity log
CREATE TABLE IF NOT EXISTS activity_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  action VARCHAR(80) NOT NULL,
  meta_json JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_activity_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX (user_id),
  INDEX (action)
);