const { getDB } = require('../config/db');

async function searchPosts(req, res) {
  const q = (req.query.q || '').trim();
  if (!q) return res.json([]);

  const db = getDB();
  const [rows] = await db.execute(
    `SELECT p.*, u.fullname, u.profile_picture
     FROM posts p
     JOIN users u ON u.id = p.user_id
     WHERE p.content LIKE ?
     ORDER BY p.created_at DESC
     LIMIT 20`,
    [`%${q}%`]
  );
  res.json(rows);
}

module.exports = { searchPosts };