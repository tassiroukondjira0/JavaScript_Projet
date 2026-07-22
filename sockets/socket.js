const { Server } = require('socket.io');

// Simple userId -> socketId mapping for real-time notifications (Sprint 2)
const userSockets = new Map();

function createSocketIO(httpServer, app) {
  const io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  function broadcastOnlineUsers() {
    const onlineIds = Array.from(userSockets.keys());
    io.emit('online_users_list', onlineIds);
  }

  io.on('connection', (socket) => {
    // Client should emit: socket.emit('register', userId)
    socket.on('register', (userId) => {
      const uid = String(userId);
      userSockets.set(uid, socket.id);
      socket.data.userId = uid;
      // Join a room named "user-{id}" so controllers can emit to specific users
      // e.g. io.to(`user-${userId}`).emit('new_notification', {...})
      socket.join(`user-${uid}`);
      broadcastOnlineUsers();
    });

    socket.on('disconnect', () => {
      const uid = socket.data?.userId;
      if (uid && userSockets.get(uid) === socket.id) {
        userSockets.delete(uid);
        broadcastOnlineUsers();
      }
    });
  });

  // Keep emitToUser accessible via returned object.


  function emitToUser(userId, event, data) {
    const uid = String(userId);
    const socketId = userSockets.get(uid);
    if (!socketId) return false;
    io.to(socketId).emit(event, data);
    return true;
  }

  return { io, emitToUser };
}

module.exports = { createSocketIO };


