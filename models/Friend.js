const { getDB } = require('../config/db');

class Friend {
  static async blockUser(blockerId, blockedId) {
    // Remove any existing friendship
    await this.removeFriend(blockerId, blockedId);
    
    const sql = `
      INSERT INTO friends (sender_id, receiver_id, status)
      VALUES (?, ?, 'blocked')
    `;
    const db = getDB();
    const result = await db.query(sql, [blockerId, blockedId]);
    return result.insertId;
  }

  static async unblockUser(blockerId, blockedId) {
    const sql = `
      DELETE FROM friends 
      WHERE sender_id = ? AND receiver_id = ? AND status = 'blocked'
    `;
    const db = getDB();
    const result = await db.query(sql, [blockerId, blockedId]);
    return result.affectedRows > 0;
  }

  static async isBlocked(userId, targetId) {
    const sql = `
      SELECT * FROM friends 
      WHERE ((sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?))
        AND status = 'blocked'
    `;
    const db = getDB();
    const rows = await db.query(sql, [userId, targetId, targetId, userId]);
    return rows.length > 0;
  }

  static async sendRequest(senderId, receiverId) {
    // Avoid self-requests
    if (senderId === receiverId) throw new Error('Cannot add yourself as a friend');

    // Check if relation already exists
    const existing = await this.getRelation(senderId, receiverId);
    if (existing !== 'none') {
      throw new Error('Relationship already exists or is pending');
    }

    const sql = `
      INSERT INTO friends (sender_id, receiver_id, status)
      VALUES (?, ?, 'pending')
    `;
    const db = getDB();
    const result = await db.query(sql, [senderId, receiverId]);
    return result.insertId;
  }

  static async respondToRequest(senderId, receiverId, accept) {
    if (accept) {
      const sql = `
        UPDATE friends 
        SET status = 'accepted' 
        WHERE sender_id = ? AND receiver_id = ? AND status = 'pending'
      `;
      const db = getDB();
      const result = await db.query(sql, [senderId, receiverId]);
      return result.affectedRows > 0;
    } else {
      const sql = `
        DELETE FROM friends 
        WHERE sender_id = ? AND receiver_id = ? AND status = 'pending'
      `;
      const db = getDB();
      const result = await db.query(sql, [senderId, receiverId]);
      return result.affectedRows > 0;
    }
  }

  static async removeFriend(userOneId, userTwoId) {
    const sql = `
      DELETE FROM friends 
      WHERE (sender_id = ? AND receiver_id = ?) 
         OR (sender_id = ? AND receiver_id = ?)
    `;
    const db = getDB();
    const result = await db.query(sql, [userOneId, userTwoId, userTwoId, userOneId]);
    return result.affectedRows > 0;
  }

  static async getRelation(userOneId, userTwoId) {
    const sql = `
      SELECT * FROM friends 
      WHERE (sender_id = ? AND receiver_id = ?) 
         OR (sender_id = ? AND receiver_id = ?)
    `;
    const db = getDB();
    const rows = await db.query(sql, [userOneId, userTwoId, userTwoId, userOneId]);
    
    if (rows.length === 0) return 'none';
    
    const rel = rows[0];
    if (rel.status === 'accepted') return 'accepted';
    if (rel.status === 'blocked') return 'blocked';
    
    // It is pending, check who sent it
    if (parseInt(rel.sender_id) === parseInt(userOneId)) {
      return 'pending_sent'; // userOne sent it, waiting for userTwo
    } else {
      return 'pending_received'; // userTwo sent it, waiting for userOne
    }
  }

  static async getFriendsList(userId) {
    const sql = `
      SELECT u.id, u.fullname, u.email, u.profile_picture, u.bio
      FROM users u
      WHERE u.id IN (
        SELECT receiver_id FROM friends WHERE sender_id = ? AND status = 'accepted'
        UNION
        SELECT sender_id FROM friends WHERE receiver_id = ? AND status = 'accepted'
      )
      ORDER BY u.fullname ASC
    `;
    const db = getDB();
    return await db.query(sql, [userId, userId]);
  }

  static async getPendingRequests(userId) {
    const sql = `
      SELECT f.id as friendship_id, u.id as user_id, u.fullname, u.profile_picture, f.created_at
      FROM friends f
      JOIN users u ON f.sender_id = u.id
      WHERE f.receiver_id = ? AND f.status = 'pending'
      ORDER BY f.created_at DESC
    `;
    const db = getDB();
    return await db.query(sql, [userId]);
  }

  static async getSentRequests(userId) {
    const sql = `
      SELECT f.id as friendship_id, u.id as user_id, u.fullname, u.profile_picture, f.created_at
      FROM friends f
      JOIN users u ON f.receiver_id = u.id
      WHERE f.sender_id = ? AND f.status = 'pending'
      ORDER BY f.created_at DESC
    `;
    const db = getDB();
    return await db.query(sql, [userId]);
  }
}

module.exports = Friend;
