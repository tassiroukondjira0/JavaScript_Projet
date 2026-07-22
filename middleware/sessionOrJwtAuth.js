const jwtAuth = require('./jwtAuth');

module.exports = (req, res, next) => {
  // If session exists with user, keep legacy behavior.
  // The session stores user as req.session.user = { id, email, role }
  if (req.session && req.session.user) {
    const role = req.session.user.role || 'USER';
    req.user = {
      userId: req.session.user.id,
      id: req.session.user.id,
      email: req.session.user.email,
      role,
      isAdmin: role === 'SUPER_ADMIN' || role === 'ADMIN',
      isSuperAdmin: role === 'SUPER_ADMIN'
    };
    return next();
  }

  // Fallback to JWT.
  return jwtAuth(req, res, (err) => {
    if (err) return next(err);
    // If JWT auth succeeded, populate session-like properties for downstream controllers
    // that still reference req.session.user
    if (req.user && req.session) {
      req.session.user = {
        id: req.user.userId || req.user.id,
        email: req.user.email || '',
        role: req.user.role || 'USER'
      };
    }
    return next();
  });
};

