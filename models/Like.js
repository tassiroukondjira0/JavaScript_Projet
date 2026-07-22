const { getDB } = require('../config/db');

class Like {
  static async toggle(postId, userId) {
    const checkSql = 'SELECT id FROM likes WHERE post_id = ? AND user_id = ?';
    const db = getDB();
    const rows = await db.query(checkSql, [postId, userId]);

    if (rows.length > 0) {
      const deleteSql = 'DELETE FROM likes WHERE post_id = ? AND user_id = ?';
      await db.query(deleteSql, [postId, userId]);
      return { liked: false };
    } else {
      const insertSql = 'INSERT INTO likes (post_id, user_id) VALUES (?, ?)';
      const db = getDB();
      await db.query(insertSql, [postId, userId]);
      return { liked: true };
    }
  }

  static async countByPostId(postId) {
    const sql = 'SELECT COUNT(*) as count FROM likes WHERE post_id = ?';
    const db = getDB();
    const result = await db.query(sql, [postId]);
    return result[0].count;
  }

  static async hasLiked(postId, userId) {
    const sql = 'SELECT id FROM likes WHERE post_id = ? AND user_id = ?';
    const db = getDB();
    const rows = await db.query(sql, [postId, userId]);
    return rows.length > 0;
  }
}

module.exports = Like;
