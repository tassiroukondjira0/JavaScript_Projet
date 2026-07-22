const { getDB } = require('../config/db');

class ActivityLog {
  static async create({ actor_user_id, action_type, entity_type = null, entity_id = null, metadata = null }) {
    const sql = `
      INSERT INTO activity_logs (actor_user_id, action_type, entity_type, entity_id, metadata)
      VALUES (?, ?, ?, ?, ?)
    `;
    const db = getDB();
    const result = await db.query(sql, [
      actor_user_id || null,
      action_type,
      entity_type,
      entity_id,
      metadata ? JSON.stringify(metadata) : null
    ]);
    return result.insertId;
  }

  static async getByUserId(userId, limit = 100) {
    const sql = `
      SELECT * FROM activity_logs
      WHERE actor_user_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `;
    const db = getDB();
    return await db.query(sql, [userId, limit]);
  }

  // For admin: get activities for all users (simple)
  static async getAll({ limit = 200 } = {}) {
    const sql = `
      SELECT * FROM activity_logs
      ORDER BY created_at DESC
      LIMIT ?
    `;
    const db = getDB();
    return await db.query(sql, [limit]);
  }
}

module.exports = ActivityLog;

