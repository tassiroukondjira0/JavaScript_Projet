const { getDB } = require('../config/db');

class SavedPost {
  static async save(userId, postId) {
    const db = getDB();
    try {
      await db.execute(
        'INSERT INTO saved_posts (user_id, post_id) VALUES (?, ?)',
        [userId, postId]
      );
      return { saved: true };
    } catch (e) {
      // Already saved -> unsave
      await db.execute(
        'DELETE FROM saved_posts WHERE user_id = ? AND post_id = ?',
        [userId, postId]
      );
      return { saved: false };
    }
  }

  static async isSaved(userId, postId) {
    const db = getDB();
    const [rows] = await db.execute(
      'SELECT id FROM saved_posts WHERE user_id = ? AND post_id = ? LIMIT 1',
      [userId, postId]
    );
    return rows.length > 0;
  }

  static async getSavedPosts(userId) {
    const db = getDB();
    const [rows] = await db.execute(
      `SELECT p.*, u.fullname, u.profile_picture, sp.created_at as saved_at
       FROM saved_posts sp
       JOIN posts p ON p.id = sp.post_id
       JOIN users u ON u.id = p.user_id
       WHERE sp.user_id = ?
       ORDER BY sp.created_at DESC`,
      [userId]
    );
    return rows;
  }

  static async getSavedCount(postId) {
    const db = getDB();
    const [rows] = await db.execute(
      'SELECT COUNT(*) as count FROM saved_posts WHERE post_id = ?',
      [postId]
    );
    return rows[0]?.count || 0;
  }
}

module.exports = SavedPost;