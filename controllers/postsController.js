const postModel = require('../models/postModel');
const { getDB } = require('../config/db');

async function feed(req, res) {
  const page = Math.max(1, Number(req.query.page || 1));
  const limit = 5;
  const offset = (page - 1) * limit;

  const posts = await postModel.listFeed({ limit, offset });

  // Welcome tour : affiché après l'inscription tant que l'utilisateur n'a pas de publication
  let showWelcomeTour = false;
  let user = null;

  // Always build a base user object from the session so the client never falls
  // back to /api/auth/me (which would loop back to /login on a redirect).
  const sessUser = req.session?.user || req.user;
  if (sessUser && sessUser.id) {
    user = {
      id: sessUser.id,
      fullname: sessUser.fullname || sessUser.email || '',
      email: sessUser.email,
      username: sessUser.username || '',
      role: sessUser.role || 'USER',
      profile_picture: sessUser.profile_picture || null,
      preferred_theme: sessUser.preferred_theme || 'dark',
      preferred_language: sessUser.preferred_language || 'fr',
      date_of_birth: sessUser.date_of_birth || null,
      phone: sessUser.phone || null,
      country_code: sessUser.country_code || null,
      country_flag: sessUser.country_flag || null,
      bio: sessUser.bio || null,
      is_admin: !!sessUser.is_admin,
      is_super_admin: !!sessUser.is_super_admin,
      is_suspended: !!sessUser.is_suspended,
      created_at: sessUser.created_at || null
    };
  }

  try {
    const userId = req.session?.user?.id || req.user?.userId || req.user?.id;
    if (userId) {
      const [rows] = await getDB().query('SELECT COUNT(*) as count FROM posts WHERE user_id = ?', [userId]);
      const postsCount = rows?.[0]?.count ?? 0;
      showWelcomeTour = postsCount === 0;

      // Fetch full user data for the template (enrich the base object).
      // NOTE: the live `users` table uses a `role` column (not is_admin/
      // is_super_admin/is_suspended), so we derive admin flags from `role`.
      const [userRows] = await getDB().query(
        `SELECT id, fullname, email, username, role, profile_picture,
                preferred_theme, preferred_language, date_of_birth, phone, country_code,
                country_flag, bio, created_at
         FROM users WHERE id = ? LIMIT 1`,
        [userId]
      );
      if (userRows && userRows.length > 0) {
        const u = userRows[0];
        const role = u.role || 'USER';
        user = {
          id: u.id,
          fullname: u.fullname,
          email: u.email,
          username: u.username,
          role,
          profile_picture: u.profile_picture,
          preferred_theme: u.preferred_theme,
          preferred_language: u.preferred_language,
          date_of_birth: u.date_of_birth,
          phone: u.phone,
          country_code: u.country_code,
          country_flag: u.country_flag,
          bio: u.bio,
          is_admin: role === 'SUPER_ADMIN' || role === 'ADMIN',
          is_super_admin: role === 'SUPER_ADMIN',
          is_suspended: false,
          created_at: u.created_at
        };
      }
    }
  } catch (e) {
    // Keep the session-derived user so the page still works without DB enrichment
    showWelcomeTour = false;
  }

  res.render('posts/index', { posts, page, showWelcomeTour, user });
}


module.exports = { feed };

