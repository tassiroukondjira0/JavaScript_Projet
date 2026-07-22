const { getDB } = require('../config/db');

async function react({ postId, userId, reactionType }) {
  const db = getDB();

  // Toggle real behavior: if user already has the same reaction -> delete (retrait)
  const [existingRows] = await db.execute(
    'SELECT reaction_type FROM reactions WHERE post_id=? AND user_id=? LIMIT 1',
    [postId, userId]
  );

  const existingType = existingRows?.[0]?.reaction_type || null;

  if (existingType && existingType === reactionType) {
    const [delRes] = await db.execute(
      'DELETE FROM reactions WHERE post_id=? AND user_id=?',
      [postId, userId]
    );
    return { changed: true, inserted: false, removed: true, reactionType };
  }

  // Otherwise: replace reaction (delete previous then insert new)
  await db.execute('DELETE FROM reactions WHERE post_id=? AND user_id=?', [postId, userId]);

  const [insRes] = await db.execute(
    'INSERT INTO reactions (post_id, user_id, reaction_type) VALUES (?,?,?)',
    [postId, userId, reactionType]
  );

  return { changed: true, inserted: true, removed: false, reactionType, insertId: insRes.insertId };
}


async function getReactionSummary({ postId }) {
  const db = getDB();
  const [rows] = await db.execute(
    'SELECT reaction_type, COUNT(*) as c FROM reactions WHERE post_id=? GROUP BY reaction_type',
    [postId]
  );
  const map = {};
  for (const r of rows) map[r.reaction_type] = r.c;
  return map;
}

module.exports = { react, getReactionSummary };

