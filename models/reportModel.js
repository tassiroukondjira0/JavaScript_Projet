const { getDB } = require('../config/db');

async function reportTarget({ targetType, targetId, reporterId, reason }) {
  const db = getDB();
  await db.execute(
    'INSERT INTO reports (target_type, target_id, reporter_id, reason) VALUES (?,?,?,?)',
    [targetType, targetId, reporterId, reason || null]
  );
}

module.exports = { reportTarget };

