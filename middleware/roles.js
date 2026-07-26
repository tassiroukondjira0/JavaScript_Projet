function requireRole(allowed = []) {
  return async (req, res, next) => {
    const role = req.session?.user?.role;
    if (!role) return res.redirect('/');
    if (allowed.includes(role)) return next();

    // If session role is not in allowed list, check DB in case role was recently changed
    // (e.g., an admin promoted this user while they were already logged in)
    try {
      const db = require('../config/db').getDB();
      const [rows] = await db.execute('SELECT role FROM users WHERE id = ?', [req.session.user.id]);
      if (rows && rows.length > 0) {
        const dbRole = rows[0].role;
        if (allowed.includes(dbRole)) {
          // Update session for subsequent requests
          req.session.user.role = dbRole;
          return next();
        }
      }
    } catch (e) {
      console.error('[roles middleware] DB check error:', e.message);
    }

    // Still not allowed
    return res.status(403).send('Forbidden');
  };
}

module.exports = { requireRole };

