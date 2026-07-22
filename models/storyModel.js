const { getDB } = require('../config/db');

class Story {
  static async create({ userId, mediaUrl, mediaType, caption }) {
    const db = getDB();
    // Expires in 24 hours
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const [result] = await db.execute(
      'INSERT INTO stories (user_id, media_url, media_type, caption, expires_at) VALUES (?, ?, ?, ?, ?)',
      [userId, mediaUrl, mediaType || 'image', caption || null, expiresAt]
    );
    return result.insertId;
  }

  static async getActiveStories(userId) {
    const db = getDB();
    const [rows] = await db.execute(
      `SELECT s.*, u.fullname, u.profile_picture
       FROM stories s
       JOIN users u ON u.id = s.user_id
       WHERE s.expires_at > NOW()
       ORDER BY s.created_at DESC`
    );
    return rows;
  }

  static async getMyActiveStories(userId) {
    const db = getDB();
    const [rows] = await db.execute(
      `SELECT s.*, u.fullname, u.profile_picture
       FROM stories s
       JOIN users u ON u.id = s.user_id
       WHERE s.user_id = ? AND s.expires_at > NOW()
       ORDER BY s.created_at DESC`,
      [userId]
    );
    return rows;
  }

  static async getFriendsStories(userId) {
    const db = getDB();
    const [rows] = await db.execute(
      `SELECT s.*, u.fullname, u.profile_picture
       FROM stories s
       JOIN users u ON u.id = s.user_id
       WHERE s.user_id IN (
         SELECT receiver_id FROM friends WHERE sender_id = ? AND status = 'accepted'
         UNION
         SELECT sender_id FROM friends WHERE receiver_id = ? AND status = 'accepted'
       )
       AND s.expires_at > NOW()
       AND s.user_id != ?
       ORDER BY s.created_at DESC`,
      [userId, userId, userId]
    );
    return rows;
  }

  static async findById(storyId) {
    const db = getDB();
    const [rows] = await db.execute(
      `SELECT s.*, u.fullname, u.profile_picture
       FROM stories s
       JOIN users u ON u.id = s.user_id
       WHERE s.id = ? AND s.expires_at > NOW()
       LIMIT 1`,
      [storyId]
    );
    return rows?.[0] || null;
  }

  static async delete(storyId) {
    const db = getDB();
    const [result] = await db.execute('DELETE FROM stories WHERE id = ?', [storyId]);
    return result.affectedRows > 0;
  }

  static async deleteExpired() {
    const db = getDB();
    const [result] = await db.execute('DELETE FROM stories WHERE expires_at <= NOW()');
    return result.affectedRows;
  }

  static async addView(storyId, viewerId) {
    const db = getDB();
    try {
      await db.execute(
        'INSERT INTO story_views (story_id, viewer_id) VALUES (?, ?)',
        [storyId, viewerId]
      );
      return true;
    } catch (e) {
      // Duplicate view = already viewed
      return false;
    }
  }

  static async getViewCount(storyId) {
    const db = getDB();
    const [rows] = await db.execute(
      'SELECT COUNT(*) as count FROM story_views WHERE story_id = ?',
      [storyId]
    );
    return rows[0]?.count || 0;
  }

  static async getViewers(storyId) {
    const db = getDB();
    const [rows] = await db.execute(
      `SELECT sv.*, u.fullname, u.profile_picture
       FROM story_views sv
       JOIN users u ON u.id = sv.viewer_id
       WHERE sv.story_id = ?
       ORDER BY sv.viewed_at DESC`,
      [storyId]
    );
    return rows;
  }
}

module.exports = Story;