'use strict';

// Simple in-memory rate limiter for OTP endpoints.
// Scope: per-userId (preferred) else per IP.
// Note: since this project uses file-backed sessions, this limiter is process-local.

const buckets = new Map();

function now() {
  return Date.now();
}

function getKey(req, userIdFallbackName = 'userId') {
  const body = req.body || {};
  const userId = body[userIdFallbackName];
  const ip = req.ip || req.headers['x-forwarded-for'] || req.connection?.remoteAddress || 'unknown';
  return userId ? `uid:${userId}` : `ip:${ip}`;
}

function purgeIfNeeded() {
  // prevent unlimited growth in long runs
  if (buckets.size < 5000) return;
  const cutoff = now() - 60 * 60 * 1000; // 1h
  for (const [key, v] of buckets.entries()) {
    if (v && v.lastTs && v.lastTs < cutoff) buckets.delete(key);
  }
}

/**
 * @param {Object} opts
 * @param {number} opts.windowMs
 * @param {number} opts.max
 */
module.exports = function rateLimitOtp(opts = {}) {
  const windowMs = Number(opts.windowMs) || 10 * 60 * 1000;
  const max = Number(opts.max) || 5;

  return (req, res, next) => {
    purgeIfNeeded();

    const key = getKey(req, 'userId');
    const ts = now();

    const b = buckets.get(key) || { count: 0, firstTs: ts, lastTs: ts };

    // If window expired, reset bucket
    if (!b.firstTs || ts - b.firstTs > windowMs) {
      b.count = 1;
      b.firstTs = ts;
      b.lastTs = ts;
      buckets.set(key, b);
      return next();
    }

    b.count += 1;
    b.lastTs = ts;

    if (b.count > max) {
      return res.status(429).json({
        error: 'Trop de tentatives. Veuillez réessayer plus tard.'
      });
    }

    buckets.set(key, b);
    return next();
  };
};

