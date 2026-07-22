const { getDB } = require('../config/db');

async function create({ post_id, user_id, content, parent_id = null }) {
  const db = getDB();
  const [res] = await db.execute(
    'INSERT INTO comments (post_id, user_id, content, parent_id) VALUES (?,?,?,?)',
    [post_id, user_id, content, parent_id]
  );
  return res.insertId;
}

async function findById(id) {
  const db = getDB();
  const [rows] = await db.execute('SELECT * FROM comments WHERE id = ? LIMIT 1', [id]);
  return rows[0] || null;
}

async function getByPostId(postId) {
  const db = getDB();
  const [rows] = await db.execute(
    'SELECT c.*, u.fullname, u.profile_picture FROM comments c JOIN users u ON u.id=c.user_id WHERE c.post_id=? ORDER BY c.created_at ASC',
    [postId]
  );
  return rows;
}

async function getReplies(parentId) {
  const db = getDB();
  const [rows] = await db.execute(
    'SELECT c.*, u.fullname, u.profile_picture FROM comments c JOIN users u ON u.id=c.user_id WHERE c.parent_id=? ORDER BY c.created_at ASC',
    [parentId]
  );
  return rows;
}

async function update(id, { content }) {
  const db = getDB();
  await db.execute('UPDATE comments SET content = ? WHERE id = ?', [content, id]);
}

async function deleteComment(id) {
  const db = getDB();
  await db.execute('DELETE FROM comments WHERE id = ?', [id]);
}

module.exports = {
  create,
  findById,
  getByPostId,
  getReplies,
  update,
  delete: deleteComment
};

