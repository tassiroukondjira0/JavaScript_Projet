const mysql = require('mysql2/promise');

let pool;

async function connectDB() {
  if (pool) return pool;

  pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD ? process.env.DB_PASSWORD : undefined,
    database: process.env.DB_NAME || 'djokko',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    timezone: 'Z'
  });

  // Test connection (can be skipped for UI-only boot)
  // IMPORTANT: DB_VALIDATE=false avoids the SELECT query, but the initial pool creation
  // may still attempt connections depending on driver config.
  const validate = process.env.DB_VALIDATE === 'true';
  if (validate) {
    const [rows] = await pool.query('SELECT 1 AS ok');
    if (!rows?.[0]?.ok) throw new Error('DB connection failed');
  }

  return pool;
}

function getDB() {
  if (!pool) throw new Error('DB pool not initialized. Call connectDB() first.');
  return pool;
}

// In future Sprint 1: role bootstrap (first registered user becomes SUPER_ADMIN)


module.exports = { connectDB, getDB };

