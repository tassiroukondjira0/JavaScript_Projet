const notificationModel = require('../models/notificationModel');

async function listNotifications(req, res) {
  try {
    const userId = req.session.user.id;
    const limit = 20;
    const offset = 0;
    const notifications = await notificationModel.listNotifications({ userId, limit, offset });
    res.json(notifications);
  } catch (err) {
    console.error('[listNotifications] Error:', err.message || err);
    res.status(500).json({ error: 'Erreur lors du chargement des notifications.' });
  }
}

async function markAllRead(req, res) {
  try {
    const userId = req.session.user.id;
    await notificationModel.markAllRead({ userId });
    res.json({ ok: true });
  } catch (err) {
    console.error('[markAllRead] Error:', err.message || err);
    res.status(500).json({ ok: false, error: 'Erreur lors de la mise à jour des notifications.' });
  }
}

async function markAsRead(req, res) {
  try {
    const userId = req.session.user.id;
    const notificationId = req.params.id;
    await notificationModel.markAsRead({ userId, notificationId });
    res.json({ ok: true });
  } catch (err) {
    console.error('[markAsRead] Error:', err.message || err);
    res.status(500).json({ ok: false, error: 'Erreur lors de la mise à jour de la notification.' });
  }
}

module.exports = { listNotifications, markAllRead, markAsRead };
