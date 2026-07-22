const { getDB } = require('../config/db');

async function create({ userId, content, image, shared_from = null }) {
  const db = getDB();
  const safeContent = (typeof content === 'string') ? content : '';
  const safeImage = (typeof image === 'string' && image.trim() !== '') ? image : null;
  const safeSharedFrom = (typeof shared_from === 'number') ? shared_from : null;
  const [res] = await db.execute(
    'INSERT INTO posts (user_id, content, image, shared_from) VALUES (?,?,?,?)',
    [userId, safeContent, safeImage, safeSharedFrom]
  );
  return res.insertId;
}

async function findById(id) {
  const db = getDB();
  const [rows] = await db.execute('SELECT * FROM posts WHERE id = ? LIMIT 1', [id]);
  return rows[0] || null;
}

async function findPostOwner(postId) {
  const db = getDB();
  const [rows] = await db.execute('SELECT user_id FROM posts WHERE id=? LIMIT 1', [postId]);
  return rows?.[0]?.user_id || null;
}

async function update(id, { content, image, shared_from }) {
  const db = getDB();
  const fields = [];
  const values = [];
  if (typeof content !== 'undefined') { fields.push('content = ?'); values.push(content); }
  if (typeof image !== 'undefined') { fields.push('image = ?'); values.push(image); }
  if (typeof shared_from !== 'undefined') { fields.push('shared_from = ?'); values.push(shared_from); }
  if (!fields.length) return;
  values.push(id);
  await db.execute(`UPDATE posts SET ${fields.join(', ')} WHERE id = ?`, values);
}

async function listFeed({ limit = 10, offset = 0 }) {
  const db = getDB();
  const lim = Math.max(1, Math.floor(Number(limit) || 10));
  const off = Math.max(0, Math.floor(Number(offset) || 0));

  const [rows] = await db.query(
    `SELECT p.*, u.fullname, u.profile_picture
     FROM posts p
     JOIN users u ON u.id = p.user_id
     ORDER BY p.created_at DESC
     LIMIT ${lim} OFFSET ${off}`
  );

  return rows.map(p => {
    let images = [];
    if (p.images_json) {
      try {
        const parsed = JSON.parse(p.images_json);
        images = Array.isArray(parsed) ? parsed.map(x => ({ filename: x })) : [];
      } catch (e) {
        images = [];
      }
    }
    return {
      ...p,
      images
    };
  });
}

module.exports = { create, findById, findPostOwner, update, listFeed };

