const { getDB } = require('../config/db');

function normalizePair(a, b) {
  const x = Number(a);
  const y = Number(b);
  return x < y ? [x, y] : [y, x];
}

async function findOrCreateConversation({ userAId, userBId }) {
  const [u1, u2] = normalizePair(userAId, userBId);
  const db = getDB();

  const [rows] = await db.execute(
    'SELECT id FROM conversations WHERE user1_id=? AND user2_id=? LIMIT 1',
    [u1, u2]
  );
  if (rows?.[0]?.id) return rows[0].id;

  const [res] = await db.execute(
    'INSERT INTO conversations (user1_id, user2_id) VALUES (?,?)',
    [u1, u2]
  );
  return res.insertId;
}

async function listConversations({ userId }) {
  const db = getDB();
  const [rows] = await db.execute(
    `SELECT c.id as conversation_id,
            CASE WHEN c.user1_id=? THEN c.user2_id ELSE c.user1_id END AS other_user_id,
            c.created_at
     FROM conversations c
     WHERE c.user1_id=? OR c.user2_id=?
     ORDER BY c.created_at DESC`,
    [userId, userId, userId]
  );
  return rows;
}

async function listMessages({ conversationId, limit = 50, offset = 0 }) {
  const db = getDB();
  const l = Math.max(1, Number(limit) || 50);
  const o = Math.max(0, Number(offset) || 0);
  const [rows] = await db.execute(
    `SELECT m.*, u.fullname, u.id as sender_id
     FROM messages m
     JOIN users u ON u.id = m.sender_id
     WHERE m.conversation_id=${Number(conversationId)}
     ORDER BY m.created_at ASC
     LIMIT ${l} OFFSET ${o}`
  );
  return rows;
}

async function addMessage({ conversationId, senderId, body }) {
  const db = getDB();
  const [res] = await db.execute(
    'INSERT INTO messages (conversation_id, sender_id, body) VALUES (?,?,?)',
    [conversationId, senderId, body]
  );
  return { id: res.insertId };
}

async function markConversationRead({ conversationId, userId }) {
  // Mark all messages in conversation as read by user
  const db = getDB();
  await db.execute(
    `INSERT INTO message_reads (message_id, user_id)
     SELECT m.id as message_id, ? as user_id
     FROM messages m
     WHERE m.conversation_id=?
     ON DUPLICATE KEY UPDATE read_at = CURRENT_TIMESTAMP`,
    [userId, conversationId]
  );
}

module.exports = {
  findOrCreateConversation,
  listConversations,
  listMessages,
  addMessage,
  markConversationRead
};

