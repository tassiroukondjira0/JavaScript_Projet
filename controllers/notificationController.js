const notificationModel = require('../models/notificationModel');

async function listNotifications(req, res) {
  const userId = req.session.user.id;
  const limit = 20;
  const offset = 0;
  const notifications = await notificationModel.listNotifications({ userId, limit, offset });
  res.json(notifications);
}

async function markAllRead(req, res) {
  const userId = req.session.user.id;
  await notificationModel.markAllRead({ userId });
  res.json({ ok: true });
}

async function markAsRead(req, res) {
  const userId = req.session.user.id;
  const notificationId = req.params.id;
  await notificationModel.markAsRead({ userId, notificationId });
  res.json({ ok: true });
}

module.exports = { listNotifications, markAllRead, markAsRead };
