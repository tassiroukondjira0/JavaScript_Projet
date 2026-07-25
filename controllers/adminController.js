const { getDB } = require('../config/db');

async function dashboard(req, res) {
  const db = getDB();

  const stats = {
    users: 0,
    posts: 0,
    comments: 0,
    reports: 0,
    notifications: 0
  };

  try {
    const [u] = await db.execute('SELECT COUNT(*) AS c FROM users');
    stats.users = u?.[0]?.c || 0;

    const [p] = await db.execute('SELECT COUNT(*) AS c FROM posts');
    stats.posts = p?.[0]?.c || 0;

    const [c] = await db.execute('SELECT COUNT(*) AS c FROM comments');
    stats.comments = c?.[0]?.c || 0;

    const [r] = await db.execute('SELECT COUNT(*) AS c FROM reports');
    stats.reports = r?.[0]?.c || 0;

    const [n] = await db.execute('SELECT COUNT(*) AS c FROM notifications');
    stats.notifications = n?.[0]?.c || 0;
  } catch (e) {
    console.error('[adminController] stats error:', e);
  }

  let recentActivity = [];
  try {
    const [rows] = await db.execute(
      'SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT 15'
    );
    recentActivity = rows || [];
  } catch (e) {
    console.error('[adminController] recentActivity error:', e);
  }

  return res.json({ stats, recentActivity });
}

async function getStats(req, res) {
  const db = getDB();
  try {
    const [[{ users_count }]] = await db.execute('SELECT COUNT(*) as users_count FROM users');
    const [[{ posts_count }]] = await db.execute('SELECT COUNT(*) as posts_count FROM posts');
    const [[{ reports_count }]] = await db.execute('SELECT COUNT(*) as reports_count FROM reports WHERE status="pending"');

    res.json({
      users: users_count || 0,
      posts: posts_count || 0,
      pending_reports: reports_count || 0
    });
  } catch (e) {
    console.error('Error in getStats:', e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

async function getUsers(req, res) {
  const db = getDB();
  try {
    const [rows] = await db.execute(
      'SELECT id, fullname, email, role, created_at FROM users ORDER BY created_at DESC LIMIT 100'
    );
    const enriched = (rows || []).map(u => ({
      ...u,
      is_admin: u.role === 'SUPER_ADMIN' || u.role === 'ADMIN',
      is_super_admin: u.role === 'SUPER_ADMIN',
      is_suspended: false
    }));
    res.json(enriched);
  } catch (e) {
    console.error('Error in getUsers:', e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

async function suspendUser(req, res) {
  const userId = req.params.id;
  const db = getDB();
  try {
    await db.execute("UPDATE users SET status='suspended' WHERE id=?", [userId]);
    res.json({ ok: true });
  } catch (e) {
    console.error('Error in suspendUser:', e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

async function reactivateUser(req, res) {
  const userId = req.params.id;
  const db = getDB();
  try {
    await db.execute("UPDATE users SET status='active' WHERE id=?", [userId]);
    res.json({ ok: true });
  } catch (e) {
    console.error('Error in reactivateUser:', e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

async function setRole(req, res) {
  const userId = req.params.id;
  const { role } = req.body;
  const db = getDB();
  try {
    const [uRows] = await db.execute('SELECT role FROM users WHERE id=? LIMIT 1', [userId]);
    if (!uRows || !uRows.length) return res.status(404).json({ error: 'Utilisateur introuvable' });
    if (uRows[0].role === 'SUPER_ADMIN') return res.status(403).json({ error: "Impossible de modifier le rôle du Super Admin" });
    await db.execute('UPDATE users SET role=? WHERE id=?', [role, userId]);
    res.json({ ok: true });
  } catch (e) {
    console.error('Error in setRole:', e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

async function deleteUser(req, res) {
  const userId = req.params.id;
  const db = getDB();
  try {
    await db.execute('DELETE FROM users WHERE id=?', [userId]);
    res.json({ ok: true });
  } catch (e) {
    console.error('Error in deleteUser:', e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

module.exports = {
  dashboard,
  getStats,
  getUsers,
  suspendUser,
  reactivateUser,
  setRole,
  deleteUser
};