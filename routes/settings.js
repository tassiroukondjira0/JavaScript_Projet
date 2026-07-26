const express = require('express');
const router = express.Router();
const { requireLogin } = require('../middleware/auth');
const { getDB } = require('../config/db');
const bcrypt = require('bcrypt');
const userModel = require('../models/userModel');
const { logActivity } = require('../utils/activityLogger');

// Helper to load full user data
async function loadUser(userId) {
  if (!userId) return null;
  try {
    const db = getDB();
    const [rows] = await db.query(
      `SELECT id, fullname, email, username, role, profile_picture, cover_picture,
              preferred_theme, preferred_language, date_of_birth, phone, country_code,
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
      preferred_language: u.preferred_language,
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

// GET /settings - Display settings page
router.get('/', requireLogin, async (req, res) => {
  const viewer = await loadUser(req.session.user.id);
  res.render('settings/index', { user: viewer, viewer });
});

// POST /settings/password - Change password
router.post('/password', requireLogin, async (req, res) => {
  const userId = req.session.user.id;
  const { current_password, new_password, confirm_password } = req.body;

  if (!current_password || !new_password || !confirm_password) {
    return res.status(400).json({ error: 'Tous les champs sont requis.' });
  }

  if (new_password !== confirm_password) {
    return res.status(400).json({ error: 'Les mots de passe ne correspondent pas.' });
  }

  // Validate password strength
  if (new_password.length < 8 || !/[a-z]/.test(new_password) || !/[A-Z]/.test(new_password) || !/\d/.test(new_password) || !/[@$!%*?&]/.test(new_password)) {
    return res.status(400).json({ error: 'Mot de passe trop faible : 8 caractères, 1 majuscule, 1 minuscule, 1 chiffre, 1 caractère spécial (@$!%*?&).' });
  }

  try {
    const db = getDB();
    const [rows] = await db.execute('SELECT * FROM users WHERE id=? LIMIT 1', [userId]);
    const user = rows[0];
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable.' });

    const ok = await bcrypt.compare(current_password, user.password);
    if (!ok) return res.status(400).json({ error: 'Mot de passe actuel incorrect.' });

    const passwordHash = await bcrypt.hash(new_password, 12);
    await db.execute('UPDATE users SET password=? WHERE id=?', [passwordHash, userId]);

    await logActivity({
      actor_user_id: userId,
      action_type: 'password_changed',
      entity_type: 'user',
      entity_id: userId
    });

    res.json({ ok: true, message: 'Mot de passe modifié avec succès.' });
  } catch (e) {
    console.error('Change password error:', e);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// POST /settings/preferences - Update preferences (theme, language)
router.post('/preferences', requireLogin, async (req, res) => {
  const userId = req.session.user.id;
  const { preferred_theme, preferred_language } = req.body;

  try {
    const db = getDB();
    const updates = [];
    const params = [];

    if (preferred_theme === 'dark' || preferred_theme === 'light') {
      updates.push('preferred_theme=?');
      params.push(preferred_theme);
      req.session.user.preferred_theme = preferred_theme;
    }
    if (preferred_language === 'fr' || preferred_language === 'en') {
      updates.push('preferred_language=?');
      params.push(preferred_language);
    }

    if (updates.length > 0) {
      params.push(userId);
      await db.execute(`UPDATE users SET ${updates.join(', ')} WHERE id=?`, params);
    }

    res.json({ ok: true, message: 'Préférences mises à jour.' });
  } catch (e) {
    console.error('Update preferences error:', e);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// POST /settings/delete-account - Delete account
router.post('/delete-account', requireLogin, async (req, res) => {
  const userId = req.session.user.id;
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({ error: 'Mot de passe requis pour confirmer la suppression.' });
  }

  try {
    const db = getDB();
    const [rows] = await db.execute('SELECT * FROM users WHERE id=? LIMIT 1', [userId]);
    const user = rows[0];
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable.' });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(400).json({ error: 'Mot de passe incorrect.' });

    // Delete user's data
    await db.execute('DELETE FROM posts WHERE user_id=?', [userId]);
    await db.execute('DELETE FROM comments WHERE user_id=?', [userId]);
    await db.execute('DELETE FROM notifications WHERE user_id=? OR receiver_id=?', [userId, userId]);
    await db.execute('DELETE FROM messages WHERE sender_id=? OR receiver_id=?', [userId, userId]);
    await db.execute('DELETE FROM reactions WHERE user_id=?', [userId]);
    await db.execute('DELETE FROM friends WHERE sender_id=? OR receiver_id=?', [userId, userId]);
    await db.execute('DELETE FROM stories WHERE user_id=?', [userId]);
    await db.execute('DELETE FROM saved_posts WHERE user_id=?', [userId]);
    await db.execute('DELETE FROM activity_logs WHERE actor_user_id=?', [userId]);

    // Finally delete user
    await db.execute('DELETE FROM users WHERE id=?', [userId]);

    // Destroy session
    req.session.destroy(() => {
      res.json({ ok: true, message: 'Compte supprimé avec succès.' });
    });
  } catch (e) {
    console.error('Delete account error:', e);
    res.status(500).json({ error: 'Erreur lors de la suppression du compte.' });
  }
});

module.exports = router;

