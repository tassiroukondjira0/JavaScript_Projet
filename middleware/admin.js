module.exports = async (req, res, next) => {
  // Support session-based auth (session stores user as req.session.user)
  if (req.session && req.session.user) {
    const user = req.session.user;
    // Check if user is admin (role === 'ADMIN' || role === 'SUPER_ADMIN')
    if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') {
      return next();
    }

    // If session role is not admin, check DB in case role was recently changed
    // (e.g., an admin promoted this user while they were already logged in)
    try {
      const db = require('../config/db').getDB();
      const [rows] = await db.execute('SELECT role FROM users WHERE id = ?', [user.id]);
      if (rows && rows.length > 0) {
        const dbRole = rows[0].role;
        if (dbRole === 'ADMIN' || dbRole === 'SUPER_ADMIN') {
          // Update session so subsequent requests don't need a DB query
          req.session.user.role = dbRole;
          return next();
        }
      }
    } catch (e) {
      console.error('[admin middleware] DB check error:', e.message);
      // Fall through to rejection below
    }
  }

  // Support JWT-based auth (from sessionOrJwtAuth middleware)
  if (req.user && (req.user.isAdmin === true || req.user.isAdmin === 1 || req.user.role === 'ADMIN' || req.user.role === 'SUPER_ADMIN')) {
    return next();
  }

  // Check if it's an API route
  if (req.originalUrl.startsWith('/api')) {
    return res.status(403).json({ error: 'Accès interdit : droits administrateur requis.' });
  }

  // Otherwise, redirect to feed page
  res.redirect('/');
};
