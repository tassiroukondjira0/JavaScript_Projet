-- Migration: add video column on posts
ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS video VARCHAR(255) NULL;

