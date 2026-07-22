const bcrypt = require('bcrypt');
const { randomOtpCode, sha256 } = require('../config/crypto');
const userModel = require('../models/userModel');
const otpModel = require('../models/otpModel');
const activityModel = require('../models/activityModel');
const { sendOtp } = require('../config/sendchamp');
const rateLimitLogin = require('../middleware/rateLimitLogin');
const jwt = require('../utils/jwt');

function validateAge(age) {
  if (typeof age === 'string') {
    const cleaned = age.replace(/[^\d]/g, '');
    const n = Number(cleaned);
    return Number.isFinite(n) && n >= 16;
  }
  const n = Number(age);
  return Number.isFinite(n) && n >= 16;
}

function validatePasswordStrength(password) {
  if (!password || typeof password !== 'string') return false;
  if (password.length < 8) return false;
  if (!/[a-z]/.test(password)) return false;
  if (!/[A-Z]/.test(password)) return false;
  if (!/\d/.test(password)) return false;
  if (!/[@$!%*?&]/.test(password)) return false;
  return true;
}

function deriveAgeFromDateOfBirth(dateOfBirth) {
  if (!dateOfBirth) return null;
  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) return null;

  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--;
  return age;
}


async function registerStep1(req, res) {
  const { firstname, lastname, username, phone, email, password, confirm_password, date_of_birth, country_code, country_flag } = req.body;

  // Validation du prénom et du nom
  if (!firstname || String(firstname).trim().length < 2) {
    return res.status(400).render('auth/register', { error: 'Prénom invalide (au moins 2 caractères).', language: req.language });
  }
  if (!lastname || String(lastname).trim().length < 2) {
    return res.status(400).render('auth/register', { error: 'Nom invalide (au moins 2 caractères).', language: req.language });
  }

  const fullname = `${firstname.trim()} ${lastname.trim()}`;

  const computedAge = deriveAgeFromDateOfBirth(date_of_birth);
  if (!validateAge(computedAge)) {
    return res.status(400).render('auth/register', { error: 'Âge minimum : 16 ans.', language: req.language });
  }

  if (!username || !/^[a-zA-Z0-9_.]{3,30}$/.test(username)) {
    return res.status(400).render('auth/register', { error: 'Nom d’utilisateur invalide (3 à 30 caractères : lettres, chiffres, _ ou .)', language: req.language });
  }

  // Confirmation du mot de passe
  if (!confirm_password || password !== confirm_password) {
    return res.status(400).render('auth/register', { error: 'Les mots de passe ne correspondent pas.', language: req.language });
  }

  // Assemblage du numéro avec l'indicatif pays
  const dial = (country_code || '').toString().trim();
  const nationalNumber = (phone || '').toString().replace(/[\s.\-()]/g, '');
  const fullPhone = `${dial}${nationalNumber}`;
  if (!dial || !/^\+[0-9]{1,4}$/.test(dial)) {
    return res.status(400).render('auth/register', { error: 'Sélectionnez un pays valide.', language: req.language });
  }
  if (!nationalNumber || !/^[0-9]{6,14}$/.test(nationalNumber)) {
    return res.status(400).render('auth/register', { error: 'Numéro de téléphone national invalide.', language: req.language });
  }

  const existing = await userModel.findByEmail(email);
  if (existing) return res.status(400).render('auth/register', { error: 'Email déjà utilisé.', language: req.language });

  const existingUsername = userModel.findByUsername
    ? await userModel.findByUsername(username)
    : null;
  if (existingUsername) return res.status(400).render('auth/register', { error: 'Nom d’utilisateur déjà pris.', language: req.language });

  if (!password || !validatePasswordStrength(password)) {
    return res.status(400).render('auth/register', { error: 'Mot de passe trop faible : 8 caractères, 1 majuscule, 1 minuscule, 1 chiffre, 1 caractère spécial (@$!%*?&).', language: req.language });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  // Langue détectée automatiquement via l'en-tête Accept-Language du navigateur
  const primaryLang = req.language || (req.session && req.session.lang) || (req.cookies && req.cookies.i18next) || 'fr';
  const { id } = await userModel.createUser({
    fullname: fullname.trim(),
    first_name: firstname.trim(),
    last_name: lastname.trim(),
    email,
    passwordHash,
    date_of_birth,
    username,
    phone: fullPhone,
    country_code: dial,
    country_flag: (country_flag || '').toString().trim() || null,
    preferred_language: primaryLang,
    preferred_theme: 'dark'
  });

  // Mémorise la langue détectée pour la session
  if (req.session) req.session.lang = primaryLang;
  res.cookie && res.cookie('i18next', primaryLang, { maxAge: 1000 * 60 * 60 * 24 * 365, httpOnly: false });

  // OTP for phone verification (SMS via Sendchamp)
  const code = randomOtpCode(6);
  const codeHash = sha256(code);
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5min (cahier des charges)
  await otpModel.createOtp({ userId: id, codeHash, purpose: 'REGISTER', expiresAt });

  // Send OTP via SMS to the phone number. Falls back to session display if Sendchamp not configured.
  const sent = await sendOtp({ phoneNumber: fullPhone, code, purpose: 'REGISTER' });
  req.session.pendingOtp = { userId: id, purpose: 'REGISTER', code, sent, phone: fullPhone };

  await activityModel.logActivity({ userId: id, action: 'REGISTER_OTP_SENT', metaJson: { email, sent } });

  return res.redirect('/auth/otp?purpose=REGISTER');
}

async function otpVerify(req, res) {
  const purpose = req.query.purpose;
  const pending = req.session.pendingOtp;
  if (!pending || pending.purpose !== purpose) return res.status(400).send('OTP invalide');

  const { code } = req.body;
  const userId = pending.userId;
  const codeHash = sha256(code);
  const now = new Date();

  const consumed = await otpModel.consumeOtp({ userId, codeHash, purpose, now });
  if (!consumed) {
    // Re-render the OTP page with a friendly error instead of a dead-end 400.
    const pendingOtp = req.session.pendingOtp;
    const showCode = pendingOtp && pendingOtp.sent === false;
    const displayCode = showCode ? pendingOtp.code : undefined;
    return res.status(400).render('auth/otp', {
      purpose,
      showCode,
      code: displayCode,
      error: 'Code OTP incorrect, expiré ou déjà utilisé. Réessayez.'
    });
  }

  // Consume session pending
  req.session.pendingOtp = null;

  const user = await userModel.findById(userId);
  req.session.user = { id: user.id, email: user.email, role: user.role, fullname: user.fullname, profile_picture: user.profile_picture };

  await activityModel.logActivity({ userId, action: 'REGISTERED', metaJson: {} });

  const accessToken = jwt.signToken({
    userId: user.id,
    email: user.email,
    role: user.role
  }, { expiresIn: '24h' });

  const refreshToken = jwt.signRefreshToken({
    userId: user.id,
    email: user.email,
    role: user.role
  });

  if (req.headers.accept?.includes('application/json')) {
    return res.json({
      access_token: accessToken,
      refresh_token: refreshToken,
      user: { id: user.id, email: user.email, role: user.role }
    });
  }

  return res.redirect('/posts');
}

async function loginStep(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).render('auth/login', { error: 'Email et mot de passe requis', language: req.language || 'fr' });

    const user = await userModel.findByEmail(email);
    if (!user) {
      const fail = rateLimitLogin.recordFailure(req);
      if (fail.blockedUntil) {
        const remaining = Math.ceil((fail.blockedUntil - Date.now()) / 1000);
        return res.status(429).render('auth/login', { error: `Compte bloqué. Réessayez dans ${remaining} secondes.`, language: req.language || 'fr' });
      }
      return res.status(400).render('auth/login', { error: 'Identifiants invalides', language: req.language || 'fr' });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      const fail = rateLimitLogin.recordFailure(req);
      if (fail.blockedUntil) {
        const remaining = Math.ceil((fail.blockedUntil - Date.now()) / 1000);
        return res.status(429).render('auth/login', { error: `Compte bloqué. Réessayez dans ${remaining} secondes.`, language: req.language || 'fr' });
      }
      return res.status(400).render('auth/login', { error: 'Identifiants invalides', language: req.language || 'fr' });
    }

    // Succès : réinitialiser les tentatives
    rateLimitLogin.resetAttempts(req);

    // Create OTP for login
    const code = randomOtpCode(6);
    const codeHash = sha256(code);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5min (cahier des charges)
    await otpModel.createOtp({
      userId: user.id,
      codeHash,
      purpose: 'LOGIN',
      expiresAt
    });

    // Envoi OTP avec timeout : ne JAMAIS bloquer la connexion
    let sent = false;
    try {
      const otpPromise = sendOtp({ phoneNumber: user.phone || email, code, purpose: 'LOGIN' });
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('OTP send timeout')), 4000)
      );
      sent = await Promise.race([otpPromise, timeoutPromise]);
    } catch (otpErr) {
      console.warn('[loginStep] sendOtp timeout/error:', otpErr.message);
      sent = false;
    }

    req.session.pendingOtp = { userId: user.id, purpose: 'LOGIN', code, sent };
    await activityModel.logActivity({ userId: user.id, action: 'LOGIN_OTP_SENT', metaJson: { email, sent } });

    return res.redirect('/auth/otp?purpose=LOGIN');
  } catch (err) {
    console.error('[loginStep] Unexpected error:', err);
    return res.status(500).render('auth/login', { error: 'Erreur interne du serveur. Veuillez réessayer.', language: req.language || 'fr' });
  }
}

async function forgotPassword(req, res) {
  const { email } = req.body;
  if (!email) return res.status(400).render('auth/forgot-password', { error: 'Email requis', language: req.language || 'fr' });

  const user = await userModel.findByEmail(email);
  if (!user) return res.status(400).render('auth/forgot-password', { error: 'Email inconnu', language: req.language || 'fr' });

  const code = randomOtpCode(6);
  const codeHash = sha256(code);
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5min (cahier des charges)
  await otpModel.createOtp({
    userId: user.id,
    codeHash,
    purpose: 'PASSWORD_RESET',
    expiresAt
  });

  const sent = await sendOtp({ phoneNumber: email, code, purpose: 'PASSWORD_RESET' });
  req.session.pendingOtp = { userId: user.id, purpose: 'PASSWORD_RESET', code, sent };
  await activityModel.logActivity({ userId: user.id, action: 'PASSWORD_RESET_OTP_SENT', metaJson: { email, sent } });

  return res.redirect('/auth/otp?purpose=PASSWORD_RESET');
}

async function resetPassword(req, res) {
  const pending = req.session.pendingOtp;
  if (!pending || pending.purpose !== 'PASSWORD_RESET') return res.status(400).render('auth/reset-password', { error: 'OTP invalide', language: req.language || 'fr' });

  const { code, password } = req.body;
  if (!password || !validatePasswordStrength(password)) {
    return res.status(400).render('auth/reset-password', { error: 'Mot de passe trop faible : 8 caractères, 1 majuscule, 1 minuscule, 1 chiffre, 1 caractère spécial (@$!%*?&)', language: req.language || 'fr' });
  }

  const userId = pending.userId;
  const codeHash = sha256(code);
  const now = new Date();

  const consumed = await otpModel.consumeOtp({ userId, codeHash, purpose: 'PASSWORD_RESET', now });
  if (!consumed) return res.status(400).render('auth/reset-password', { error: 'Code OTP incorrect ou expiré', language: req.language || 'fr' });

  const passwordHash = await bcrypt.hash(password, 12);
  const db = require('../config/db').getDB();
  await db.execute('UPDATE users SET password=? WHERE id=?', [passwordHash, userId]);

  req.session.pendingOtp = null;
  await activityModel.logActivity({ userId, action: 'PASSWORD_RESET', metaJson: {} });

  return res.redirect('/auth/login');
}

module.exports = { registerStep1, otpVerify, loginStep, forgotPassword, resetPassword };

