const chatModel = require('../models/chatModel');

async function getConversations(req, res) {
  const userId = req.session.user.id;
  const convos = await chatModel.listConversations({ userId });
  res.json({ ok: true, convos });
}

async function findOrCreateConversation(req, res) {
  const userId = req.session.user.id;
  const { otherUserId } = req.body;
  
  if (!otherUserId || Number(otherUserId) === Number(userId)) {
    return res.status(400).json({ ok: false, error: 'Destinataire invalide' });
  }

  const conversationId = await chatModel.findOrCreateConversation({ 
    userAId: userId, 
    userBId: otherUserId 
  });
  
  res.json({ ok: true, conversationId });
}

async function getMessages(req, res) {
  const userId = req.session.user.id;
  const conversationId = Number(req.params.conversationId);

  const messages = await chatModel.listMessages({ conversationId, limit: 80, offset: 0 });
  res.json({ ok: true, conversationId, messages });
}

async function postMessage(req, res) {
  const senderId = req.session.user.id;
  const conversationId = Number(req.params.conversationId);
  const body = (req.body.body || '').trim();
  if (!body) return res.status(400).json({ ok: false, error: 'body requis' });

  await chatModel.addMessage({ conversationId, senderId, body });
  await chatModel.markConversationRead({ conversationId, userId: senderId });
  
  // Emit to the other user via socket
  const io = req.app.get('socketio');
  const socketApi = req.app.get('socketApi');
  if (socketApi) {
    const convos = await chatModel.listConversations({ userId: senderId });
    const convo = convos.find(c => Number(c.conversation_id) === Number(conversationId));
    const other = convo?.other_user_id;
    if (other) {
      socketApi.emitToUser(other, 'chat:message', { conversationId, senderId: senderId, body });
    }
  }
  
  res.json({ ok: true, conversationId });
}


module.exports = { getConversations, findOrCreateConversation, getMessages, postMessage };

