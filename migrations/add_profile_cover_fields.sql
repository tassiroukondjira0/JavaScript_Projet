-- Migration: Add profile cover photo, location, and establishment fields
ALTER TABLE users
  ADD COLUMN cover_photo VARCHAR(255) DEFAULT NULL AFTER profile_picture,
  ADD COLUMN location VARCHAR(255) DEFAULT NULL AFTER bio,
  ADD COLUMN establishment VARCHAR(255) DEFAULT NULL AFTER location;