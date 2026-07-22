const chatModel = require('../models/chatModel');

// Wire chat events into socket.io
function registerChat(io, socketApi) {
  io.on('connection', (socket) => {
    // Requires: socket emits 'register' earlier to set socket.data.userId

    socket.on('chat:typing', (data) => {
      const userId = socket.data?.userId;
      if (!userId) return;
      const { conversationId, toUserId } = data || {};
      if (!conversationId || !toUserId) return;

      if (socketApi?.emitToUser) {
        socketApi.emitToUser(toUserId, 'chat:typing', { conversationId, fromUserId: userId });
      }
    });

    socket.on('chat:send', async (data, cb) => {
      const senderId = socket.data?.userId;
      if (!senderId) return cb && cb({ ok: false, error: 'not authenticated' });

      try {
        const { conversationId, otherUserId, body } = data || {};
        if (!body || String(body).trim().length === 0) {
          return cb && cb({ ok: false, error: 'body requis' });
        }

        let convId = Number(conversationId);
        if (!convId && otherUserId) {
          convId = await chatModel.findOrCreateConversation({ userAId: senderId, userBId: otherUserId });
        }
        if (!convId) return cb && cb({ ok: false, error: 'conversationId requis' });

        const cleanBody = String(body).trim();
        await chatModel.addMessage({ conversationId: convId, senderId, body: cleanBody });
        await chatModel.markConversationRead({ conversationId: convId, userId: senderId });

        // Infer other user to deliver socket message
        const convos = await chatModel.listConversations({ userId: senderId });
        const convo = convos.find((c) => Number(c.conversation_id) === Number(convId));
        const other = convo?.other_user_id;

        const payload = { conversationId: convId, senderId, body: cleanBody };

        // sender echo
        socket.emit('chat:message', payload);

        // receiver notify
        if (other && socketApi?.emitToUser) {
          socketApi.emitToUser(other, 'chat:message', payload);
        }

        return cb && cb({ ok: true, conversationId: convId });
      } catch (e) {
        console.error(e);
        return cb && cb({ ok: false, error: 'server error' });
      }
    });


    socket.on('chat:read', async (data) => {
      const userId = socket.data?.userId;
      if (!userId) return;
      const { conversationId } = data || {};
      if (!conversationId) return;

      await chatModel.markConversationRead({ conversationId: Number(conversationId), userId });

      // Could send read receipts back later (Sprint 3 step)
      // socketApi.emitToUser(otherUserId, 'chat:read', ...)
    });
  });
}

module.exports = { registerChat };


