function requireLogin(req, res, next) {
  if (req.session?.user) return next();

  // For API/JSON requests, return 401 (don't redirect to the login page,
  // otherwise the browser fetch() follows the redirect and gets HTML).
  const wantsJson =
    req.headers.accept?.includes('application/json') ||
    req.xhr ||
    req.originalUrl?.startsWith('/api/');
  if (wantsJson) {
    return res.status(401).json({ error: 'Non authentifié' });
  }
  return res.redirect('/auth/login');
}

module.exports = { requireLogin };
