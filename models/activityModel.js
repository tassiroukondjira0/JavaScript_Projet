const { getDB } = require('../config/db');

async function logActivity({ userId, action, metaJson }) {
  const db = getDB();
  await db.execute(
    'INSERT INTO activity_log (user_id, action, meta_json) VALUES (?,?,?)',
    [userId || null, action, metaJson ? JSON.stringify(metaJson) : null]
  );
}

module.exports = { logActivity };

