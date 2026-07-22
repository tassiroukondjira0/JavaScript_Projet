-- Add verification_reference fields for Sendchamp REST OTP (create/confirm)

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS phone_verification_reference VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS login_verification_reference VARCHAR(255) NULL;

CREATE INDEX IF NOT EXISTS idx_phone_verification_reference
  ON users(phone_verification_reference);

CREATE INDEX IF NOT EXISTS idx_login_verification_reference
  ON users(login_verification_reference);

