// Script to create activity_logs table
require('dotenv').config({ override: true });
const mysql = require('mysql2/promise');

async function run() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD ? process.env.DB_PASSWORD : undefined,
    database: process.env.DB_NAME || 'djokko'
  });

  console.log('Creating activity_logs table...');
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS activity_logs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      actor_user_id INT,
      action_type VARCHAR(100) NOT NULL,
      entity_type VARCHAR(50),
      entity_id INT,
      metadata TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_actor_user_id (actor_user_id),
      INDEX idx_action_type (action_type),
      INDEX idx_created_at (created_at)
    ) ENGINE=InnoDB;
  `);
  console.log('✅ activity_logs table created');
  await connection.end();
}

run().catch(console.error);