const { getDB } = require('../config/db');

class Post {
  static async create({ user_id, content, image, shared_from = null }) {
    const sql = `
      INSERT INTO posts (user_id, content, image, shared_from)
      VALUES (?, ?, ?, ?)
    `;
    const db = getDB();
    const result = await db.query(sql, [user_id, content, image, shared_from]);
    return result.insertId;
  }

  static async findById(id) {
    const sql = `
      SELECT p.*, u.fullname, u.profile_picture
      FROM posts p
      JOIN users u ON p.user_id = u.id
      WHERE p.id = ?
    `;
    const db = getDB();
    const rows = await db.query(sql, [id]);
    return rows.length > 0 ? rows[0] : null;
  }

  static async update(id, { content, image, shared_from }) {
    const updates = [];
    const params = [];

    if (content !== undefined) {
      updates.push('content = ?');
      params.push(content);
    }
    if (image !== undefined) {
      updates.push('image = ?');
      params.push(image);
    }
    if (shared_from !== undefined) {
      updates.push('shared_from = ?');
      params.push(shared_from);
    }

    if (updates.length === 0) return 0;

    params.push(id);
    const sql = `UPDATE posts SET ${updates.join(', ')} WHERE id = ?`;
    const db = getDB();
    const result = await db.query(sql, params);
    return result.affectedRows;
  }

  static async delete(id) {
    const sql = 'DELETE FROM posts WHERE id = ?';
    const db = getDB();
    const result = await db.query(sql, [id]);
    return result.affectedRows;
  }

  static async getFeed(currentUserId) {
    // Fetches posts by current user and their friends
    const sql = `
      SELECT p.*, u.fullname, u.profile_picture,
             (SELECT COUNT(*) FROM reactions r WHERE r.post_id = p.id) as likes_count,
             (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id AND c.parent_id IS NULL) as comments_count,
             (SELECT reaction_type FROM reactions r WHERE r.post_id = p.id AND r.user_id = ?) as user_reaction
      FROM posts p
      JOIN users u ON p.user_id = u.id
      WHERE p.user_id = ? 
         OR p.user_id IN (
           SELECT receiver_id FROM friends WHERE sender_id = ? AND status = 'accepted'
           UNION
           SELECT sender_id FROM friends WHERE receiver_id = ? AND status = 'accepted'
         )
      ORDER BY p.created_at DESC
    `;
    const db = getDB();
    return await db.query(sql, [currentUserId, currentUserId, currentUserId, currentUserId]);
  }

  static async getProfileFeed(profileUserId, currentUserId) {
    // Fetches posts by a specific user (for their profile page)
    const sql = `
      SELECT p.*, u.fullname, u.profile_picture,
             (SELECT COUNT(*) FROM reactions r WHERE r.post_id = p.id) as likes_count,
             (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id AND c.parent_id IS NULL) as comments_count,
             (SELECT reaction_type FROM reactions r WHERE r.post_id = p.id AND r.user_id = ?) as user_reaction
      FROM posts p
      JOIN users u ON p.user_id = u.id
      WHERE p.user_id = ?
      ORDER BY p.created_at DESC
    `;
    const db = getDB();
    return await db.query(sql, [currentUserId, profileUserId]);
  }

  static async search(queryText, currentUserId) {
    const sql = `
      SELECT p.*, u.fullname, u.profile_picture,
             (SELECT COUNT(*) FROM reactions r WHERE r.post_id = p.id) as likes_count,
             (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id AND c.parent_id IS NULL) as comments_count,
             (SELECT reaction_type FROM reactions r WHERE r.post_id = p.id AND r.user_id = ?) as user_reaction
      FROM posts p
      JOIN users u ON p.user_id = u.id
      WHERE p.content LIKE ?
      ORDER BY p.created_at DESC
    `;
    const formattedTerm = `%${queryText}%`;
    const db = getDB();
    return await db.query(sql, [currentUserId, formattedTerm]);
  }

  static async getAll(currentUserId) {
    const sql = `
      SELECT p.*, u.fullname, u.profile_picture,
             (SELECT COUNT(*) FROM reactions r WHERE r.post_id = p.id) as likes_count,
             (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id AND c.parent_id IS NULL) as comments_count,
             (SELECT reaction_type FROM reactions r WHERE r.post_id = p.id AND r.user_id = ?) as user_reaction
      FROM posts p
      JOIN users u ON p.user_id = u.id
      ORDER BY p.created_at DESC
    `;
    const db = getDB();
    return await db.query(sql, [currentUserId]);
  }
}

module.exports = Post;