const { getDB } = require('../config/db');

async function createOtp({ userId, codeHash, purpose, expiresAt }) {
  const db = getDB();
  await db.execute(
    'INSERT INTO otps (user_id, code_hash, purpose, expires_at, consumed_at) VALUES (?,?,?,?,NULL)',
    [userId, codeHash, purpose, expiresAt]
  );
}

async function consumeOtp({ userId, codeHash, purpose, now }) {
  const db = getDB();
  const [rows] = await db.execute(
    `SELECT id FROM otps 
     WHERE user_id=? AND code_hash=? AND purpose=? AND consumed_at IS NULL AND expires_at > ?
     ORDER BY id DESC LIMIT 1`,
    [userId, codeHash, purpose, now]
  );

  if (!rows?.length) return null;
  const otpId = rows[0].id;
  await db.execute('UPDATE otps SET consumed_at=? WHERE id=?', [now, otpId]);
  return otpId;
}

module.exports = { createOtp, consumeOtp };

