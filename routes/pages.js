const express = require('express');
const router = express.Router();
const path = require('path');
const { requireLogin } = require('../middleware/auth');
const admin = require('../middleware/admin');
const Friend = require('../models/Friend');

// Helper to check if already logged in, redirects to feed
const redirectIfLoggedIn = (req, res, next) => {
  if (req.session && req.session.user) {
    return res.redirect('/');
  }
  next();
};

// Auth pages
router.get('/login', redirectIfLoggedIn, (req, res) => {
  res.render('auth/login', { language: req.language || 'fr' });
});

router.get('/register', redirectIfLoggedIn, (req, res) => {
  res.render('auth/register', { language: req.language || 'fr' });
});

router.get('/password-reset', redirectIfLoggedIn, (req, res) => {
  res.render('auth/reset-password', { language: req.language || 'fr' });
});


// Landing (public) + redirect to posts after login
router.get('/', (req, res, next) => {
  if (req.session && req.session.user) {
    return res.redirect('/posts');
  }
  res.render('landing', { language: req.language || 'fr' });

});

// Redirect /feed to /posts (canonical feed URL)
router.get('/feed', requireLogin, (req, res) => {
  return res.redirect('/posts');
});

// Helper: load full user data from the DB including computed admin flags
async function loadUser(userId) {
  if (!userId) return null;
  try {
    const db = require('../config/db').getDB();
    const [rows] = await db.query(
      `SELECT id, fullname, email, username, role, profile_picture, cover_picture,
              preferred_theme, date_of_birth, phone, country_code,
              country_flag, bio, passions, city, country, created_at
       FROM users WHERE id = ? LIMIT 1`,
      [userId]
    );
    if (!rows || !rows.length) return null;
    const u = rows[0];
    const role = u.role || 'USER';
    return {
      id: u.id, fullname: u.fullname, email: u.email, username: u.username,
      role, profile_picture: u.profile_picture, preferred_theme: u.preferred_theme,
      date_of_birth: u.date_of_birth,
      phone: u.phone, country_code: u.country_code, country_flag: u.country_flag,
      bio: u.bio, passions: u.passions, establishment: u.city, location: u.country,
      cover_photo: u.cover_picture,
      is_admin: role === 'SUPER_ADMIN' || role === 'ADMIN',
      is_super_admin: role === 'SUPER_ADMIN', is_suspended: false, created_at: u.created_at
    };
  } catch (e) {
    return null;
  }
}

router.get('/dashboard', requireLogin, async (req, res) => {
  const viewer = await loadUser(req.session.user.id);
  // For dashboard, user viewing their own profile, so viewer = user
  res.render('profile/index', { user: viewer, viewer, profileUser: viewer });
});

// Profile editing page
router.get('/profile/edit', requireLogin, async (req, res) => {
  const viewer = await loadUser(req.session.user.id);
  res.render('profile/edit', { user: viewer, viewer, profileUser: viewer });
});

router.get('/profile/:id', requireLogin, async (req, res) => {
  const viewer = await loadUser(req.session.user.id);
  const profileUser = await loadUser(Number(req.params.id) || req.session.user.id);
  let friendStatus = 'none';
  if (viewer && profileUser && viewer.id !== profileUser.id) {
    try {
      friendStatus = await Friend.getRelation(viewer.id, profileUser.id);
    } catch (e) {
      friendStatus = 'none';
    }
  }
  res.render('profile/index', { user: viewer, viewer, profileUser, friendStatus });
});

router.get('/friends', requireLogin, async (req, res) => {
  const viewer = await loadUser(req.session.user.id);
  res.render('friends/index', { user: viewer });
});

router.get('/messages', requireLogin, async (req, res) => {
  const viewer = await loadUser(req.session.user.id);
  res.render('chat/index', { user: viewer });
});

router.get('/notifications', requireLogin, async (req, res) => {
  const viewer = await loadUser(req.session.user.id);
  res.render('notifications/index', { user: viewer });
});

router.get('/activity', requireLogin, async (req, res) => {
  const viewer = await loadUser(req.session.user.id);
  res.render('activity/index', { user: viewer });
});

// Discover users page
router.get('/users', requireLogin, async (req, res) => {
  const viewer = await loadUser(req.session.user.id);
  res.render('users/discover', { user: viewer });
});

// Saved posts page
router.get('/posts/saved', requireLogin, async (req, res) => {
  const viewer = await loadUser(req.session.user.id);
  res.render('posts/saved', { user: viewer });
});

// Admin pages
router.get('/admin', requireLogin, admin, async (req, res) => {
  const viewer = await loadUser(req.session.user.id);
  const adminController = require('../controllers/adminController');
  const data = await new Promise((resolve) => {
    const chunks = [];
    const mockRes = {
      json: (payload) => resolve(payload),
      status: () => mockRes,
      send: () => resolve({})
    };
    adminController.dashboard(req, mockRes);
  });
  res.render('admin/dashboard', { user: viewer, stats: data.stats, recentActivity: data.recentActivity });
});

router.get('/admin/reports', requireLogin, admin, async (req, res) => {
  const viewer = await loadUser(req.session.user.id);
  let reports = [];
  try {
    const db = require('../config/db').getDB();
    const [rows] = await db.query(
      `SELECT r.id, r.target_type, r.target_id, r.reason, r.created_at,
              u.fullname AS reporter_name
       FROM reports r
       LEFT JOIN users u ON u.id = r.reporter_id
       ORDER BY r.created_at DESC LIMIT 100`
    );
    reports = rows || [];
  } catch (e) {
    reports = [];
  }
  res.render('admin/reports', { user: viewer, reports });
});

router.get('/admin/users', requireLogin, admin, async (req, res) => {
  const viewer = await loadUser(req.session.user.id);
  try {
    const db = require('../config/db').getDB();
    const [rows] = await db.execute(
      'SELECT id, fullname, email, role, status, created_at FROM users ORDER BY created_at DESC LIMIT 100'
    );
    res.render('admin/users', { user: viewer, users: rows || [] });
  } catch (e) {
    res.render('admin/users', { user: viewer, users: [] });
  }
});

router.get('/admin/activity', requireLogin, admin, async (req, res) => {
  const viewer = await loadUser(req.session.user.id);
  res.render('notifications/index', { user: viewer });
});

module.exports = router;

