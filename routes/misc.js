const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  // Already logged in → go straight to the feed
  if (req.session && req.session.user) {
    return res.redirect('/posts');
  }

  const lang = req.language || 'fr';
  res.render('landing', { language: lang });
});

router.get('/about', (req, res) => {
  res.render('about');
});

// Language switcher: sets i18next cookie (and keeps it in session if available)
router.get('/lang/:lng', (req, res) => {
  const SUPPORTED = ['fr', 'en'];
  const lng = SUPPORTED.includes(req.params.lng) ? req.params.lng : 'fr';

  res.cookie('i18next', lng, {
    maxAge: 1000 * 60 * 60 * 24 * 365,
    httpOnly: false
  });

  if (req.session) req.session.lang = lng;

  const back = req.get('Referer') || '/';
  res.redirect(back);
});

module.exports = router;

