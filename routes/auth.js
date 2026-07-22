const express = require('express');
const router = express.Router();

const {
  registerStep1,
  otpVerify,
  loginStep,
  forgotPassword,
  resetPassword
} = require('../controllers/authController');

const rateLimitLogin = require('../middleware/rateLimitLogin');
const rateLimitOtpAttempts = require('../middleware/rateLimitOtpAttempts');
const { refreshToken } = require('../controllers/refreshController');

router.get('/login', (req, res) => res.render('auth/login'));
router.get('/register', (req, res) => res.render('auth/register'));

router.post('/register', registerStep1);
router.post('/login', rateLimitLogin(), loginStep);

router.get('/otp', (req, res) => {
  const purpose = req.query.purpose || 'REGISTER';
  const pending = req.session.pendingOtp;

  // In local/test mode (no Sendchamp), reveal the code to the user
  const showCode = pending && pending.sent === false;
  const code = showCode ? pending.code : undefined;

  res.render('auth/otp', { purpose, showCode, code });
});

router.post('/otp', rateLimitOtpAttempts({ max: 3, windowMs: 5 * 60 * 1000 }), otpVerify);

router.get('/forgot-password', (req, res) => res.render('auth/forgot-password'));
router.post('/forgot-password', forgotPassword);

router.get('/reset-password', (req, res) => {
  const pending = req.session.pendingOtp;
  if (!pending || pending.purpose !== 'PASSWORD_RESET') return res.redirect('/auth/login');
  res.render('auth/reset-password');
});

router.post('/reset-password', resetPassword);

// Refresh token (JWT)
router.post('/refresh-token', refreshToken);

module.exports = router;

