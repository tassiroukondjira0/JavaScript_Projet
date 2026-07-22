const { getDB } = require('../config/db');

// Reaction types as per specification
const REACTION_TYPES = {
  like: '❤️',
  love: '😍',
  haha: '😂',
  wow: '😮',
  sad: '😢',
  angry: '😡'
};

class Reaction {
  static async toggle({ postId, userId, reactionType }) {
    if (!REACTION_TYPES.hasOwnProperty(reactionType)) {
      throw new Error('Type de réaction invalide');
    }

    // Check if user already reacted
    const checkSql = 'SELECT id, reaction_type FROM reactions WHERE post_id = ? AND user_id = ?';
    const db = getDB();
    const rows = await db.query(checkSql, [postId, userId]);

    if (rows.length > 0) {
      if (rows[0].reaction_type === reactionType) {
        // Same reaction: remove it
        const deleteSql = 'DELETE FROM reactions WHERE post_id = ? AND user_id = ?';
        const db = getDB();
        await db.query(deleteSql, [postId, userId]);
        return { reacted: false, reactionType: null };
      } else {
        // Different reaction: update it
        const updateSql = 'UPDATE reactions SET reaction_type = ?, created_at = NOW() WHERE post_id = ? AND user_id = ?';
        const db = getDB();
        await db.query(updateSql, [reactionType, postId, userId]);
        return { reacted: true, reactionType };
      }
    } else {
      // New reaction
      const insertSql = 'INSERT INTO reactions (post_id, user_id, reaction_type) VALUES (?, ?, ?)';
      const db = getDB();
      await db.query(insertSql, [postId, userId, reactionType]);
      return { reacted: true, reactionType };
    }
  }

  static async countByPostId(postId) {
    const sql = `
      SELECT reaction_type, COUNT(*) as count 
      FROM reactions 
      WHERE post_id = ? 
      GROUP BY reaction_type
    `;
    const db = getDB();
    const result = await db.query(sql, [postId]);
    
    // Format result as { like: 5, love: 3, etc }
    const counts = {};
    result.forEach(r => {
      counts[r.reaction_type] = r.count;
    });
    return counts;
  }

  static async getUserReaction(postId, userId) {
    const sql = 'SELECT reaction_type FROM reactions WHERE post_id = ? AND user_id = ?';
    const db = getDB();
    const rows = await db.query(sql, [postId, userId]);
    return rows.length > 0 ? rows[0].reaction_type : null;
  }

  static async getTotalCount(postId) {
    const sql = 'SELECT COUNT(*) as count FROM reactions WHERE post_id = ?';
    const db = getDB();
    const result = await db.query(sql, [postId]);
    return result[0].count;
  }
}

module.exports = Reaction;
module.exports.REACTION_TYPES = REACTION_TYPES;