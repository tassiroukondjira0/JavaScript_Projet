module.exports = (req, res, next) => {
  // Support session-based auth (legacy)
  if (req.session && req.session.userId && req.session.isSuperAdmin) {
    return next();
  }

  // Support JWT-based auth (from sessionOrJwtAuth middleware)
  if (req.user && (req.user.isSuperAdmin === true || req.user.isSuperAdmin === 1)) {
    return next();
  }

  // Check if it's an API route
  if (req.originalUrl && req.originalUrl.startsWith('/api')) {
    return res.status(403).json({ error: 'Accès interdit : super administrateur requis.' });
  }

  res.redirect('/');
};

