const { getDB } = require('../config/db');

class Comment {
  static async create({ post_id, user_id, content, parent_id = null }) {
    const sql = `
      INSERT INTO comments (post_id, user_id, content, parent_id)
      VALUES (?, ?, ?, ?)
    `;
    const db = getDB();
    const result = await db.query(sql, [post_id, user_id, content, parent_id]);
    return result.insertId;
  }

  static async findById(id) {
    const sql = 'SELECT * FROM comments WHERE id = ?';
    const db = getDB();
    const rows = await db.query(sql, [id]);
    return rows.length > 0 ? rows[0] : null;
  }

  static async getByPostId(postId) {
    // Get top-level comments only (not replies)
    const sql = `
      SELECT c.*, u.fullname, u.profile_picture
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.post_id = ? AND c.parent_id IS NULL
      ORDER BY c.created_at ASC
    `;
    const db = getDB();
    return await db.query(sql, [postId]);
  }

  static async getReplies(parentId) {
    // Get replies for a specific comment
    const sql = `
      SELECT c.*, u.fullname, u.profile_picture
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.parent_id = ?
      ORDER BY c.created_at ASC
    `;
    const db = getDB();
    return await db.query(sql, [parentId]);
  }

  static async delete(id) {
    const sql = 'DELETE FROM comments WHERE id = ?';
    const db = getDB();
    const result = await db.query(sql, [id]);
    return result.affectedRows;
  }

  static async update(id, { content }) {
    const sql = 'UPDATE comments SET content = ? WHERE id = ?';
    const db = getDB();
    const result = await db.query(sql, [content, id]);
    return result.affectedRows;
  }
}

module.exports = Comment;