const { getDB } = require('../config/db');

class Notification {
  static async create({ receiver_id, sender_id, type, entity_id }) {
    // Avoid notifying oneself (e.g. liking or commenting on one's own post)
    if (parseInt(receiver_id) === parseInt(sender_id)) return null;

    const sql = `
      INSERT INTO notifications (receiver_id, sender_id, type, entity_id, is_read)
      VALUES (?, ?, ?, ?, 0)
    `;
    const db = getDB();
    const result = await db.query(sql, [receiver_id, sender_id, type, entity_id]);
    return result.insertId;
  }

  static async getByUserId(userId) {
    const sql = `
      SELECT n.*, u.fullname as sender_name, u.profile_picture as sender_picture
      FROM notifications n
      JOIN users u ON n.sender_id = u.id
      WHERE n.receiver_id = ?
      ORDER BY n.created_at DESC
      LIMIT 50
    `;
    const db = getDB();
    return await db.query(sql, [userId]);
  }

  static async markAsRead(id, userId) {
    const sql = `
      UPDATE notifications 
      SET is_read = 1 
      WHERE id = ? AND receiver_id = ?
    `;
    const db = getDB();
    const result = await db.query(sql, [id, userId]);
    return result.affectedRows > 0;
  }

  static async markAllAsRead(userId) {
    const sql = `
      UPDATE notifications 
      SET is_read = 1 
      WHERE receiver_id = ?
    `;
    const db = getDB();
    const result = await db.query(sql, [userId]);
    return result.affectedRows;
  }
}

module.exports = Notification;
