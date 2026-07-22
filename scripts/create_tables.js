// Script to create saved_posts, stories, and story_views tables
require('dotenv').config({ override: true });
const mysql = require('mysql2/promise');

async function run() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD ? process.env.DB_PASSWORD : undefined,
    database: process.env.DB_NAME || 'djokko',
    multipleStatements: true
  });

  console.log('Connected to database:', process.env.DB_NAME || 'djokko');

  const sql = `
    SET SESSION foreign_key_checks = 0;

    -- Saved posts (favorites / bookmarks)
    CREATE TABLE IF NOT EXISTS saved_posts (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      post_id INT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY unique_save (user_id, post_id),
      INDEX idx_user_id (user_id),
      INDEX idx_post_id (post_id)
    ) ENGINE=InnoDB;

    -- Stories (disappear after 24h)
    CREATE TABLE IF NOT EXISTS stories (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      media_url VARCHAR(500) NOT NULL,
      media_type ENUM('image', 'video') NOT NULL DEFAULT 'image',
      caption TEXT,
      expires_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_user_id (user_id),
      INDEX idx_expires_at (expires_at)
    ) ENGINE=InnoDB;

    -- Story views (who viewed which story)
    CREATE TABLE IF NOT EXISTS story_views (
      id INT AUTO_INCREMENT PRIMARY KEY,
      story_id INT NOT NULL,
      viewer_id INT NOT NULL,
      viewed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY unique_view (story_id, viewer_id),
      INDEX idx_story_id (story_id),
      INDEX idx_viewer_id (viewer_id)
    ) ENGINE=InnoDB;

    SET SESSION foreign_key_checks = 1;
  `;

  try {
    await connection.query(sql);
    console.log('✅ Tables created successfully: saved_posts, stories, story_views');
  } catch (err) {
    console.error('❌ Error creating tables:', err.message);
  }

  await connection.end();
  process.exit(0);
}

run();