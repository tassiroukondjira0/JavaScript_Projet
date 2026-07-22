'use strict';

// Rate limiter pour les tentatives de connexion
// Limite : 3 tentatives échouées → blocage 15 minutes

const attempts = new Map();

function now() {
  return Date.now();
}

function getKey(req) {
  const { email } = req.body || {};
  const ip = req.ip || req.headers['x-forwarded-for'] || req.connection?.remoteAddress || 'unknown';
  return email ? `login:email:${email}` : `login:ip:${ip}`;
}

function purgeIfNeeded() {
  if (attempts.size < 5000) return;
  const cutoff = now() - 60 * 60 * 1000; // 1h
  for (const [key, v] of attempts.entries()) {
    if (v && v.lastTs && v.lastTs < cutoff) attempts.delete(key);
  }
}

/**
 * Middleware de limitation des tentatives de connexion
 * @param {Object} opts
 * @param {number} opts.max - Nombre max de tentatives échouées (défaut: 3)
 * @param {number} opts.blockMs - Durée de blocage en ms (défaut: 15min)
 */
module.exports = function rateLimitLogin(opts = {}) {
  const max = Number(opts.max) || 3;
  const blockMs = Number(opts.blockMs) || 15 * 60 * 1000; // 15min

  return async (req, res, next) => {
    purgeIfNeeded();

    const key = getKey(req);
    const ts = now();
    const b = attempts.get(key) || { count: 0, firstTs: ts, lastTs: ts, blockedUntil: null };

    // Vérifier si blocage actif
    if (b.blockedUntil && ts < b.blockedUntil) {
      const remainingTime = Math.ceil((b.blockedUntil - ts) / 1000);
      if (req.headers.accept && req.headers.accept.includes('application/json')) {
        return res.status(429).json({
          error: `Compte temporairement bloqué. Réessayez dans ${remainingTime} secondes.`,
          retryAfter: remainingTime
        });
      }
      return res.status(429).render('auth/login', { error: `Compte temporairement bloqué. Réessayez dans ${remainingTime} secondes.` });
    }

    // Si fenêtre expirée, réinitialiser
    const windowMs = 15 * 60 * 1000; // 15min window
    if (!b.firstTs || ts - b.firstTs > windowMs) {
      b.count = 0;
      b.firstTs = ts;
      b.lastTs = ts;
      b.blockedUntil = null;
      attempts.set(key, b);
    }

    // Stocker les infos de tentatives pour le contrôleur
    req.loginAttempts = b;

    next();
  };
};

/**
 * Enregistre une tentative échouée
 */
module.exports.recordFailure = function(req) {
  const key = getKey(req);
  const ts = now();
  const b = attempts.get(key) || { count: 0, firstTs: ts, lastTs: ts, blockedUntil: null };
  
  const windowMs = 15 * 60 * 1000;
  if (!b.firstTs || ts - b.firstTs > windowMs) {
    b.count = 0;
    b.firstTs = ts;
    b.lastTs = ts;
    b.blockedUntil = null;
  }

  b.count += 1;
  b.lastTs = ts;

  const max = 3;
  const blockMs = 15 * 60 * 1000;

  if (b.count >= max) {
    b.blockedUntil = ts + blockMs;
  }

  attempts.set(key, b);
  return b;
};

/**
 * Réinitialise les tentatives après succès
 */
module.exports.resetAttempts = function(req) {
  const key = getKey(req);
  attempts.delete(key);
};