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
  'friend_accept': 'NEW_FRIEND_REQUEST',
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
  
  // Use query() instead of execute() for LIMIT/OFFSET compatibility
  const [rows] = await db.query(
    `SELECT n.*
     FROM notifications n
     WHERE n.user_id = ?
     ORDER BY n.created_at DESC
     LIMIT ?
     OFFSET ?`,
    [Number(userId), l, o]
  );

  // Parse payload JSON and resolve sender info using a single batch query
  const result = [];
  const senderIds = new Set();

  // First pass: parse payloads and collect unique sender IDs
  for (const n of rows) {
    let payload = {};
    if (n.payload) {
      try { payload = typeof n.payload === 'string' ? JSON.parse(n.payload) : n.payload; } catch (e) {}
    }
    const senderId = payload.sender_id;
    if (senderId) {
      senderIds.add(String(senderId));
    }
  }

  // Batch resolve all sender names/pictures in one query
  const senderMap = {};
  if (senderIds.size > 0) {
    try {
      const ids = Array.from(senderIds).map(Number).filter(id => id > 0);
      if (ids.length > 0) {
        const placeholders = ids.map(() => '?').join(',');
        const [userRows] = await db.query(
          `SELECT id, fullname, profile_picture FROM users WHERE id IN (${placeholders})`,
          ids
        );
        for (const u of (userRows || [])) {
          senderMap[String(u.id)] = {
            sender_name: u.fullname,
            sender_picture: u.profile_picture
          };
        }
      }
    } catch (e) {
      console.error('[notificationModel] Error resolving senders batch:', e.message);
    }
  }

  // Second pass: build result with enriched data
  for (const n of rows) {
    let payload = {};
    if (n.payload) {
      try { payload = typeof n.payload === 'string' ? JSON.parse(n.payload) : n.payload; } catch (e) {}
    }

    const senderId = payload.sender_id;
    const senderInfo = senderId ? (senderMap[String(senderId)] || {}) : {};

    result.push({
      ...n,
      payload,
      sender_id: senderId || null,
      entity_id: payload.entity_id || null,
      sender_name: senderInfo.sender_name || null,
      sender_picture: senderInfo.sender_picture || null
    });
  }

  return result;
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
