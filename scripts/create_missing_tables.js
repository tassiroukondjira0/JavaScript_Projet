// Script to create missing tables: friends, conversations, message_reads, etc.
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

    -- Friends table (friendship relationships)
    CREATE TABLE IF NOT EXISTS friends (
      id INT AUTO_INCREMENT PRIMARY KEY,
      sender_id INT NOT NULL,
      receiver_id INT NOT NULL,
      status VARCHAR(50) DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY unique_friend (sender_id, receiver_id),
      INDEX idx_sender_id (sender_id),
      INDEX idx_receiver_id (receiver_id),
      INDEX idx_status (status)
    ) ENGINE=InnoDB;

    -- Conversations table for direct messaging
    CREATE TABLE IF NOT EXISTS conversations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user1_id INT NOT NULL,
      user2_id INT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY unique_conversation (user1_id, user2_id),
      INDEX idx_user1_id (user1_id),
      INDEX idx_user2_id (user2_id)
    ) ENGINE=InnoDB;

    -- Message read receipts
    CREATE TABLE IF NOT EXISTS message_reads (
      id INT AUTO_INCREMENT PRIMARY KEY,
      message_id INT NOT NULL,
      user_id INT NOT NULL,
      read_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY unique_read (message_id, user_id),
      INDEX idx_message_id (message_id),
      INDEX idx_user_id (user_id)
    ) ENGINE=InnoDB;

    -- OTPs table (if missing)
    CREATE TABLE IF NOT EXISTS otps (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      otp_code VARCHAR(10) NOT NULL,
      otp_expires_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_user_id (user_id),
      INDEX idx_otp_code (otp_code)
    ) ENGINE=InnoDB;

    -- Notifications table (if missing)
    CREATE TABLE IF NOT EXISTS notifications (
      id INT AUTO_INCREMENT PRIMARY KEY,
      receiver_id INT NOT NULL,
      sender_id INT NOT NULL,
      type VARCHAR(50) NOT NULL,
      entity_id INT,
      is_read TINYINT DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_receiver_id (receiver_id),
      INDEX idx_sender_id (sender_id),
      INDEX idx_entity_id (entity_id)
    ) ENGINE=InnoDB;

    SET SESSION foreign_key_checks = 1;
  `;

  try {
    await connection.query(sql);
    console.log('✅ All missing tables created successfully:');
    console.log('   - friends');
    console.log('   - conversations');
    console.log('   - message_reads');
    console.log('   - otps');
    console.log('   - notifications');
  } catch (err) {
    console.error('❌ Error creating tables:', err.message);
  }

  await connection.end();
  process.exit(0);
}

run();