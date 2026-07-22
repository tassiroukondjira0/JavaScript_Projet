-- Migration: Add preferred language and theme columns to users table
-- Multi-language support: increased to VARCHAR(100) for comma-separated values
ALTER TABLE users
  ADD COLUMN preferred_language VARCHAR(100) DEFAULT 'fr' AFTER establishment,
  ADD COLUMN preferred_theme VARCHAR(10) DEFAULT 'dark' AFTER preferred_language;