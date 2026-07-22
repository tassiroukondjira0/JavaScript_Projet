const { getDB } = require('../config/db');

class Message {
  static async create({ sender_id, receiver_id, content, image = null }) {
    const sql = `
      INSERT INTO messages (sender_id, receiver_id, content, image, is_read)
      VALUES (?, ?, ?, ?, 0)
    `;
    const db = getDB();
    const result = await db.query(sql, [sender_id, receiver_id, content, image]);
    return result.insertId;
  }

  static async getChatHistory(userOneId, userTwoId) {
    const sql = `
      SELECT m.*, 
             s.fullname as sender_name, s.profile_picture as sender_picture,
             r.fullname as receiver_name, r.profile_picture as receiver_picture
      FROM messages m
      JOIN users s ON m.sender_id = s.id
      JOIN users r ON m.receiver_id = r.id
      WHERE (m.sender_id = ? AND m.receiver_id = ?)
         OR (m.sender_id = ? AND m.receiver_id = ?)
      ORDER BY m.created_at ASC
    `;
    const db = getDB();
    return await db.query(sql, [userOneId, userTwoId, userTwoId, userOneId]);
  }

  static async getChatPartners(userId) {
    const sql = `
      SELECT u.id, u.fullname, u.profile_picture,
             (SELECT COUNT(*) FROM messages m WHERE m.sender_id = u.id AND m.receiver_id = ? AND m.is_read = 0) as unread_count,
             (SELECT m.content FROM messages m 
              WHERE (m.sender_id = u.id AND m.receiver_id = ?) 
                 OR (m.sender_id = ? AND m.receiver_id = u.id)
              ORDER BY m.created_at DESC LIMIT 1) as last_message,
             (SELECT m.created_at FROM messages m 
              WHERE (m.sender_id = u.id AND m.receiver_id = ?) 
                 OR (m.sender_id = ? AND m.receiver_id = u.id)
              ORDER BY m.created_at DESC LIMIT 1) as last_message_time
      FROM users u
      WHERE u.id IN (
        SELECT sender_id FROM messages WHERE receiver_id = ?
        UNION
        SELECT receiver_id FROM messages WHERE sender_id = ?
      )
      ORDER BY last_message_time DESC
    `;
    const db = getDB();
    return await db.query(sql, [userId, userId, userId, userId, userId, userId, userId]);
  }

  static async markAsRead(messageId, userId) {
    const sql = `
      UPDATE messages 
      SET is_read = 1, read_at = NOW() 
      WHERE id = ? AND receiver_id = ?
    `;
    const db = getDB();
    const result = await db.query(sql, [messageId, userId]);
    return result.affectedRows > 0;
  }

  static async markAllAsRead(senderId, receiverId) {
    const sql = `
      UPDATE messages 
      SET is_read = 1, read_at = NOW() 
      WHERE sender_id = ? AND receiver_id = ? AND is_read = 0
    `;
    const db = getDB();
    const result = await db.query(sql, [senderId, receiverId]);
    return result.affectedRows;
  }

  static async getUnreadCount(userId, partnerId) {
    const sql = `
      SELECT COUNT(*) as count FROM messages 
      WHERE sender_id = ? AND receiver_id = ? AND is_read = 0
    `;
    const db = getDB();
    const result = await db.query(sql, [partnerId, userId]);
    return result[0]?.count || 0;
  }
}

module.exports = Message;