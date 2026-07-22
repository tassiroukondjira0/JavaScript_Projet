const { getDB } = require('../config/db');

async function sharePost({ postId, userId }) {
  const db = getDB();
  await db.execute(
    'INSERT IGNORE INTO shares (post_id, user_id) VALUES (?,?)',
    [postId, userId]
  );
}

module.exports = { sharePost };

