const jwtAuth = require('./jwtAuth');

// Same as jwtAuth, but allows falling through if missing token.
// Used only if route wants to accept both session and refresh flow.
module.exports = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    // no token: continue (route may be public)
    return next();
  }
  return jwtAuth(req, res, next);
};

