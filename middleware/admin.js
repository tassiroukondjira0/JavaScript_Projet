module.exports = (req, res, next) => {
  // Support session-based auth (session stores user as req.session.user)
  if (req.session && req.session.user) {
    const user = req.session.user;
    // Check if user is admin (role === 'ADMIN' || role === 'SUPER_ADMIN')
    if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') {
      return next();
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