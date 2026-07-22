const express = require('express');
const router = express.Router();
const { requireLogin } = require('../middleware/auth');
const notificationController = require('../controllers/notificationController');

router.get('/', requireLogin, (req, res) => res.render('notifications/index'));
router.get('/list', requireLogin, notificationController.listNotifications);
router.post('/mark-all-read', requireLogin, notificationController.markAllRead);

module.exports = router;