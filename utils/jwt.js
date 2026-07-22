const jwt = require('jsonwebtoken');

function getJwtSecret() {
  return process.env.JWT_SECRET || 'fallback_jwt_secret_change_me';
}

function getJwtExpiresIn() {
  return process.env.JWT_EXPIRES_IN || '7d';
}

function signToken(payload, options = {}) {
  const expiresIn = options.expiresIn || getJwtExpiresIn();
  return jwt.sign(payload, getJwtSecret(), { expiresIn });
}

function verifyToken(token) {
  return jwt.verify(token, getJwtSecret());
}

function getRefreshExpiresIn() {
  return process.env.JWT_REFRESH_EXPIRES_IN || '7d';
}

function signRefreshToken(payload) {
  return signToken(payload, { expiresIn: getRefreshExpiresIn() });
}


module.exports = {
  signToken,
  verifyToken,
  signRefreshToken
};


