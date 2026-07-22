'use strict';

// Rate limiter pour les tentatives de vérification OTP
// Limite : 3 tentatives maximum par utilisateur/OTP

const attempts = new Map();

function now() {
  return Date.now();
}

function getKey(req) {
  const body = req.body || {};
  const userId = body.userId || req.session?.pendingOtp?.userId;
  const ip = req.ip || req.headers['x-forwarded-for'] || req.connection?.remoteAddress || 'unknown';
  return userId ? `otp_attempts:uid:${userId}` : `otp_attempts:ip:${ip}`;
}

function purgeIfNeeded() {
  if (attempts.size < 5000) return;
  const cutoff = now() - 60 * 60 * 1000; // 1h
  for (const [key, v] of attempts.entries()) {
    if (v && v.lastTs && v.lastTs < cutoff) attempts.delete(key);
  }
}

/**
 * Middleware de limitation des tentatives OTP
 * @param {Object} opts
 * @param {number} opts.max - Nombre max de tentatives (défaut: 3)
 * @param {number} opts.windowMs - Fenêtre de temps en ms (défaut: 5min)
 */
module.exports = function rateLimitOtpAttempts(opts = {}) {
  const max = Number(opts.max) || 3;
  const windowMs = Number(opts.windowMs) || 5 * 60 * 1000; // 5min

  return (req, res, next) => {
    purgeIfNeeded();

    const key = getKey(req);
    const ts = now();

    const b = attempts.get(key) || { count: 0, firstTs: ts, lastTs: ts, blockedUntil: null };

    // Vérifier si blocage actif
    if (b.blockedUntil && ts < b.blockedUntil) {
      const remainingTime = Math.ceil((b.blockedUntil - ts) / 1000);
      if (req.headers.accept && req.headers.accept.includes('application/json')) {
        return res.status(429).json({
          error: `Trop de tentatives. Réessayez dans ${remainingTime} secondes.`,
          retryAfter: remainingTime
        });
      }
      return res.status(429).render('auth/otp', { error: `Trop de tentatives. Réessayez dans ${remainingTime} secondes.`, purpose: req.query.purpose || 'REGISTER' });
    }

    // Si fenêtre expirée, réinitialiser
    if (!b.firstTs || ts - b.firstTs > windowMs) {
      b.count = 1;
      b.firstTs = ts;
      b.lastTs = ts;
      b.blockedUntil = null;
      attempts.set(key, b);
      return next();
    }

    b.count += 1;
    b.lastTs = ts;

    // Dernière tentative autorisée -> bloquer pour la durée de la fenêtre
    if (b.count > max) {
      b.blockedUntil = ts + windowMs;
      attempts.set(key, b);
      if (req.headers.accept && req.headers.accept.includes('application/json')) {
        return res.status(429).json({
          error: `Trop de tentatives (max ${max}). Réessayez dans ${windowMs / 1000} secondes.`,
          retryAfter: windowMs / 1000
        });
      }
      return res.status(429).render('auth/otp', { error: `Trop de tentatives (max ${max}). Réessayez dans ${windowMs / 1000} secondes.`, purpose: req.query.purpose || 'REGISTER' });
    }

    attempts.set(key, b);
    next();
  };
};