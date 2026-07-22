const { getDB } = require('../config/db');

class Report {
  static async create({ reporter_id, entity_type, entity_id, reason }) {
    const sql = `
      INSERT INTO reports (reporter_id, entity_type, entity_id, reason, status)
      VALUES (?, ?, ?, ?, 'pending')
    `;
    const db = getDB();
    const result = await db.query(sql, [reporter_id, entity_type, entity_id, reason]);
    return result.insertId;
  }

  static async getPending() {
    const sql = `
      SELECT r.*, u.fullname AS reporter_name, u.profile_picture AS reporter_picture
      FROM reports r
      JOIN users u ON r.reporter_id = u.id
      WHERE r.status = 'pending'
      ORDER BY r.created_at DESC
      LIMIT 200
    `;
    const db = getDB();
    return db.query(sql);
  }

  static async getAll() {
    const sql = `
      SELECT r.*, u.fullname AS reporter_name, u.profile_picture AS reporter_picture
      FROM reports r
      JOIN users u ON r.reporter_id = u.id
      ORDER BY r.created_at DESC
      LIMIT 500
    `;
    const db = getDB();
    return db.query(sql);
  }

  static async setStatus(reportId, status) {
    const sql = `
      UPDATE reports SET status = ? WHERE id = ?
    `;
    const db = getDB();
    const result = await db.query(sql, [status, reportId]);
    return result.affectedRows > 0;
  }

  static async countByStatus(status) {
    const sql = `
      SELECT COUNT(*) as count FROM reports WHERE status = ?
    `;
    const db = getDB();
    const res = await db.query(sql, [status]);
    return res[0]?.count || 0;
  }
}

module.exports = Report;

