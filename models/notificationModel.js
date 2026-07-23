const { getDB } = require('../config/db');

/**
 * Map legacy/short type names to DB ENUM values.
 * DB ENUM: 'NEW_COMMENT','NEW_REACTION','NEW_MESSAGE','NEW_FRIEND_REQUEST'
 */
const TYPE_MAP = {
  'like': 'NEW_REACTION',
  'reaction': 'NEW_REACTION',
  'share': 'NEW_REACTION',
  'comment': 'NEW_COMMENT',
  'reply': 'NEW_COMMENT',
  'comment_reply': 'NEW_COMMENT',
  'friend_request': 'NEW_FRIEND_REQUEST',
  'message': 'NEW_MESSAGE',
  // Already valid:
  'NEW_COMMENT': 'NEW_COMMENT',
  'NEW_REACTION': 'NEW_REACTION',
  'NEW_MESSAGE': 'NEW_MESSAGE',
  'NEW_FRIEND_REQUEST': 'NEW_FRIEND_REQUEST'
};

/**
 * Create a notification.
 * Accepts both formats:
 *  - Modern: { user_id, type, payload }
 *  - Legacy: { receiver_id, sender_id, type, entity_id }
 * Internally normalizes to the DB columns (user_id, type, payload, is_read).
 */
async function create(params) {
  const db = getDB();

  // Normalize parameters to match DB columns: user_id, type, payload
  let userId = params.user_id || params.receiver_id || params.userId;
  let type = TYPE_MAP[params.type] || 'NEW_REACTION';
  let payload = params.payload;

  // If legacy format (sender_id + entity_id instead of payload), build payload
  if (!payload && (params.sender_id || params.entity_id)) {
    payload = {};
    if (params.sender_id) payload.sender_id = params.sender_id;
    if (params.entity_id) payload.entity_id = params.entity_id;
  }

  // Ensure payload is an object (not a string)
  if (typeof payload === 'string') {
    try { payload = JSON.parse(payload); } catch (e) { payload = {}; }
  }
  if (!payload) payload = {};

  const is_read = params.is_read || 0;

  const [res] = await db.execute(
    'INSERT INTO notifications (user_id, type, payload, is_read) VALUES (?,?,?,?)',
    [userId, type, JSON.stringify(payload), is_read]
  );
  return res.insertId;
}

async function listNotifications({ userId, limit = 20, offset = 0 }) {
  const db = getDB();
  const l = Math.max(1, Number(limit) || 20);
  const o = Math.max(0, Number(offset) || 0);
  const [rows] = await db.execute(
    `SELECT n.*
     FROM notifications n
     WHERE n.user_id = ?
     ORDER BY n.created_at DESC
     LIMIT ? OFFSET ?`,
    [Number(userId), l, o]
  );

  // Parse payload JSON and extract sender info from payload
  return rows.map(n => {
    let payload = {};
    if (n.payload) {
      try { payload = typeof n.payload === 'string' ? JSON.parse(n.payload) : n.payload; } catch (e) {}
    }
    return {
      ...n,
      payload,
      sender_id: payload.sender_id || null,
      entity_id: payload.entity_id || null
    };
  });
}

async function markAllRead({ userId }) {
  const db = getDB();
  await db.execute('UPDATE notifications SET is_read=TRUE WHERE user_id=?', [userId]);
}

async function markAsRead({ userId, notificationId }) {
  const db = getDB();
  await db.execute('UPDATE notifications SET is_read=TRUE WHERE id=? AND user_id=?', [notificationId, userId]);
}

module.exports = { create, listNotifications, markAllRead, markAsRead };

