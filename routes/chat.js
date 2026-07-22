const express = require('express');
const router = express.Router();

const { requireLogin } = require('../middleware/auth');
const chatController = require('../controllers/chatController');

router.get('/', requireLogin, (req, res) => {
  // Minimal page placeholder for now
  res.render('chat/index', { user: req.session.user });
});

router.get('/conversations', requireLogin, chatController.getConversations);
router.post('/conversations', requireLogin, chatController.findOrCreateConversation);
router.get('/conversations/:conversationId/messages', requireLogin, chatController.getMessages);
router.post('/conversations/:conversationId/messages', requireLogin, chatController.postMessage);

module.exports = router;


