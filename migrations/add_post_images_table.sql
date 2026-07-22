-- Migration: add images_json column on posts (multi-photo without post_images table)
ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS images_json LONGTEXT NULL;






