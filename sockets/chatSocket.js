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
        const { conversationId, otherUserId, body, image } = data || {};
        if ((!body || String(body).trim().length === 0) && !image) {
          return cb && cb({ ok: false, error: 'body ou image requis' });
        }

        let convId = Number(conversationId);
        if (!convId && otherUserId) {
          convId = await chatModel.findOrCreateConversation({ userAId: senderId, userBId: otherUserId });
        }
        if (!convId) return cb && cb({ ok: false, error: 'conversationId requis' });

        const cleanBody = body ? String(body).trim() : '';
        const msgData = { conversationId: convId, senderId, body: cleanBody };
        if (image) msgData.image = image;
        
        await chatModel.addMessage(msgData);
        await chatModel.markConversationRead({ conversationId: convId, userId: senderId });

        // Infer other user to deliver socket message
        // Get other user ID from conversation participants
        const db = require('../config/db').getDB();
        const [convRows] = await db.execute(
          'SELECT user1_id, user2_id FROM conversations WHERE id = ? LIMIT 1',
          [convId]
        );
        let other = null;
        if (convRows && convRows.length > 0) {
          other = String(convRows[0].user1_id) === String(senderId) 
            ? convRows[0].user2_id 
            : convRows[0].user1_id;
        }

        const payload = { conversationId: convId, senderId, body: cleanBody };
        if (image) payload.image = image;

        // sender echo (used for confirmation, but receiver ignores it)
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


