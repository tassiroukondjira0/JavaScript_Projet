-- Adds password reset by OTP fields with anti-abuse tracking

ALTER TABLE users
  ADD COLUMN password_reset_code VARCHAR(10) NULL,
  ADD COLUMN password_reset_expires_at DATETIME NULL,

  -- Track reset requests / rate limiting
  ADD COLUMN password_reset_request_count INT NOT NULL DEFAULT 0,
  ADD COLUMN password_reset_request_first_at DATETIME NULL,

  -- Cooldown after abuse: block new reset requests for 7 days
  ADD COLUMN password_reset_block_until DATETIME NULL,

  -- Track last used password reset to prevent reuse (optional)
  ADD COLUMN password_reset_last_used_hash VARCHAR(255) NULL;

