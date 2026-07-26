const { getDB } = require('../config/db');
const bcrypt = require('bcrypt');

async function listUsers(req, res) {
  const db = getDB();
  const [users] = await db.execute('SELECT id, fullname, email, role, created_at FROM users ORDER BY created_at DESC');
  res.render('admin/users', { users });
}

async function updateUserRole(req, res) {
  const db = getDB();
  const userId = Number(req.params.userId);
  const role = req.body.role;
  if (!['USER', 'ADMIN', 'SUPER_ADMIN'].includes(role)) return res.status(400).send('Rôle invalide');

  // Prevent modifying SUPER_ADMIN role (except SUPER_ADMIN themselves if allowed, here we block all)
  const [userRows] = await db.execute('SELECT role FROM users WHERE id=? LIMIT 1', [userId]);
  if (!userRows || !userRows.length) return res.status(404).send('Utilisateur introuvable');
  const currentRole = userRows[0].role;
  if (currentRole === 'SUPER_ADMIN') {
    return res.status(403).send("Impossible de modifier le rôle du Super Admin");
  }

  // Prevent ADMIN from changing roles at all, optional extra safety
  if (req.session && req.session.user && req.session.user.role === 'ADMIN') {
    // Allow only if target is not SUPER_ADMIN (already blocked above) but block anything else?
    // For now just keep the SUPER_ADMIN protection, since requireRole already ensures only ADMIN/SUPER_ADMIN can call this
  }

  await db.execute('UPDATE users SET role=? WHERE id=?', [role, userId]);
  return res.redirect('/admin/crud/users');
}

async function deletePost(req, res) {
  const db = getDB();
  const postId = Number(req.params.postId);
  await db.execute('DELETE FROM posts WHERE id=?', [postId]);
  return res.redirect('/admin/crud/posts');
}

async function listPosts(req, res) {
  const db = getDB();
  const [posts] = await db.execute(
    `SELECT p.*, u.fullname FROM posts p JOIN users u ON u.id=p.user_id ORDER BY p.created_at DESC LIMIT 50`
  );
  res.render('admin/posts', { posts });
}

async function listReports(req, res) {
  const db = getDB();
  const [reports] = await db.execute(
    `SELECT r.*, u.fullname as reporter_name FROM reports r JOIN users u ON u.id=r.reporter_id ORDER BY r.created_at DESC LIMIT 50`
  );
  res.render('admin/reports', { reports });
}

async function listComments(req, res) {
  const db = getDB();
  const [comments] = await db.execute(
    `SELECT c.*, u.fullname as user_name, p.content as post_content
     FROM comments c
     JOIN users u ON u.id=c.user_id
     JOIN posts p ON p.id=c.post_id
     ORDER BY c.created_at DESC
     LIMIT 50`
  );
  res.render('admin/comments', { comments });
}

async function deleteComment(req, res) {
  const db = getDB();
  const commentId = Number(req.params.commentId);
  await db.execute('DELETE FROM comments WHERE id=?', [commentId]);
  return res.redirect('/admin/crud/comments');
}

module.exports = { listUsers, updateUserRole, deletePost, listPosts, listReports, listComments, deleteComment };
