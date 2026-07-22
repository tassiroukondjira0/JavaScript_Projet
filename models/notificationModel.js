const { getDB } = require('../config/db');

async function create({ receiver_id, sender_id, type, payload, is_read = 0 }) {
  const db = getDB();
  const [res] = await db.execute(
    'INSERT INTO notifications (receiver_id, sender_id, type, payload, is_read) VALUES (?,?,?,?,?)',
    [receiver_id, sender_id, type, payload ? JSON.stringify(payload) : null, is_read]
  );
  return res.insertId;
}

async function listNotifications({ userId, limit = 20, offset = 0 }) {
  const db = getDB();
  const l = Math.max(1, Number(limit) || 20);
  const o = Math.max(0, Number(offset) || 0);
  const [rows] = await db.execute(
    `SELECT n.*, u.fullname AS sender_name, u.profile_picture AS sender_picture
     FROM notifications n
     LEFT JOIN users u ON n.sender_id = u.id
     WHERE n.receiver_id = ?
     ORDER BY n.created_at DESC
     LIMIT ? OFFSET ?`,
    [Number(userId), l, o]
  );
  return rows;
}

async function markAllRead({ userId }) {
  const db = getDB();
  await db.execute('UPDATE notifications SET is_read=TRUE WHERE receiver_id=?', [userId]);
}

async function markAsRead({ userId, notificationId }) {
  const db = getDB();
  await db.execute('UPDATE notifications SET is_read=TRUE WHERE id=? AND receiver_id=?', [notificationId, userId]);
}

module.exports = { create, listNotifications, markAllRead, markAsRead };

