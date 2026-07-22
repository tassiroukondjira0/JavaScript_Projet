-- Migration: Add passions field to users
ALTER TABLE users
  ADD COLUMN passions TEXT DEFAULT NULL AFTER bio;
