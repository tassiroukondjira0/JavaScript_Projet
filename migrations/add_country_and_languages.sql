-- Migration: support multi-language selection and store country code/flag
ALTER TABLE users
  MODIFY COLUMN preferred_language VARCHAR(100) DEFAULT 'fr',
  ADD COLUMN country_code VARCHAR(10) DEFAULT NULL AFTER phone,
  ADD COLUMN country_flag VARCHAR(16) DEFAULT NULL AFTER country_code;