const { getDB } = require('../config/db');

async function getMe(req, res) {
  const userSession = req.session?.user || req.user;
  if (!userSession || !userSession.id) {
    return res.status(401).json({ error: 'Non authentifié' });
  }

  try {
    const db = getDB();
    const [rows] = await db.execute(
      `SELECT id, fullname, email, username, role, profile_picture, cover_picture,
              preferred_theme, preferred_language, date_of_birth, phone, country_code, 
              country_flag, bio, passions, city, country, created_at
       FROM users WHERE id = ? LIMIT 1`,
      [userSession.id]
    );

    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'Utilisateur introuvable' });
    }

    const user = rows[0];
    const role = user.role || 'USER';
    res.json({
      id: user.id,
      fullname: user.fullname,
      email: user.email,
      username: user.username,
      role,
      profile_picture: user.profile_picture,
      cover_photo: user.cover_picture,
      preferred_theme: user.preferred_theme,
      preferred_language: user.preferred_language,
      date_of_birth: user.date_of_birth,
      phone: user.phone,
      country_code: user.country_code,
      country_flag: user.country_flag,
      bio: user.bio,
      passions: user.passions,
      establishment: user.city,
      location: user.country,
      is_admin: role === 'SUPER_ADMIN' || role === 'ADMIN',
      is_super_admin: role === 'SUPER_ADMIN',
      is_suspended: false,
      created_at: user.created_at
    });
  } catch (err) {
    console.error('Error in getMe:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

async function getProfile(req, res) {
  const userId = req.params.id;
  // Viewer identity (session or JWT)
  const viewerId = req.user?.userId || req.session?.user?.id;
  const viewerRole = req.user?.role || req.session?.user?.role;
  const isPrivileged = viewerRole === 'ADMIN' || viewerRole === 'SUPER_ADMIN';
  const isSelf = Number(viewerId) === Number(userId);

  try {
    const db = getDB();
    const [rows] = await db.execute(
      `SELECT id, fullname, email, username, role, profile_picture, cover_picture,
              bio, city, country, preferred_language, preferred_theme, created_at
       FROM users WHERE id = ? LIMIT 1`,
      [userId]
    );
    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'Utilisateur introuvable' });
    }
    const user = rows[0];
    // Email is only visible to the owner, admins and super-admins
    if (!isSelf && !isPrivileged) {
      delete user.email;
    }
    res.json(user);
  } catch (err) {
    console.error('Error in getProfile:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

async function updateProfile(req, res) {
  const userSession = req.session?.user || req.user;
  if (!userSession || !userSession.id) {
    return res.status(401).json({ error: 'Non authentifié' });
  }

  try {
    const db = getDB();
    const updates = [];
    const params = [];

    if (req.body.bio !== undefined) { updates.push('bio=?'); params.push(req.body.bio); }
    if (req.body.fullname !== undefined) { updates.push('fullname=?'); params.push(req.body.fullname); }
    if (req.body.establishment !== undefined) { updates.push('city=?'); params.push(req.body.establishment); }
    if (req.body.location !== undefined) { updates.push('country=?'); params.push(req.body.location); }
    if (req.body.preferred_language !== undefined) { updates.push('preferred_language=?'); params.push(req.body.preferred_language); }
    if (req.body.preferred_theme !== undefined) { updates.push('preferred_theme=?'); params.push(req.body.preferred_theme); }

    if (updates.length === 0) {
      return res.json({ ok: true });
    }

    params.push(userSession.id);
    await db.execute(`UPDATE users SET ${updates.join(', ')} WHERE id=?`, params);

    const [rows] = await db.execute('SELECT * FROM users WHERE id=? LIMIT 1', [userSession.id]);
    res.json({ ok: true, user: rows[0] });
  } catch (err) {
    console.error('Error in updateProfile:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

async function getUserStats(req, res) {
  const userSession = req.session?.user || req.user;
  if (!userSession || !userSession.id) {
    return res.status(401).json({ error: 'Non authentifié' });
  }

  try {
    const db = getDB();
    const [[{ posts_count }]] = await db.execute('SELECT COUNT(*) as posts_count FROM posts WHERE user_id=?', [userSession.id]);
    const [[{ friends_count }]] = await db.execute('SELECT COUNT(*) as friends_count FROM friends WHERE (user_id=? OR friend_id=?) AND status="accepted"', [userSession.id, userSession.id]);

    res.json({
      posts_count: posts_count || 0,
      friends_count: friends_count || 0
    });
  } catch (err) {
    console.error('Error in getUserStats:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

async function searchUsers(req, res) {
  const q = (req.query.q || '').trim();
  if (!q) return res.json([]);

  // Viewer identity (session or JWT)
  const viewerRole = req.user?.role || req.session?.user?.role;
  const isPrivileged = viewerRole === 'ADMIN' || viewerRole === 'SUPER_ADMIN';

  const db = getDB();
  const [rows] = await db.execute(
    `SELECT id, fullname, email, profile_picture
     FROM users
     WHERE fullname LIKE ? OR email LIKE ?
     ORDER BY fullname ASC
     LIMIT 20`,
    [`%${q}%`, `%${q}%`]
  );

  // Email is only visible to admins and super-admins
  const result = rows.map(u => ({
    id: u.id,
    fullname: u.fullname,
    profile_picture: u.profile_picture,
    email: isPrivileged ? u.email : null
  }));
  res.json(result);
}

module.exports = { getMe, getProfile, updateProfile, getUserStats, searchUsers };
