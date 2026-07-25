const { Server } = require('socket.io');

// Map of userId -> Set<socketId> so that a user is only considered offline when
// ALL of their sockets disconnect (handles multiple tabs, reconnections, etc.).
const userSockets = new Map(); // userId -> Set<socketId>

function createSocketIO(httpServer, app) {
  const io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  function broadcastOnlineUsers() {
    // A user is online if they have at least one socket in their set
    const onlineIds = Array.from(userSockets.keys()).filter(id => {
      const set = userSockets.get(id);
      return set && set.size > 0;
    });
    io.emit('online_users_list', onlineIds);
  }

  io.on('connection', (socket) => {
    // Client should emit: socket.emit('register', userId)
    socket.on('register', (userId) => {
      const uid = String(userId);
      if (!userSockets.has(uid)) {
        userSockets.set(uid, new Set());
      }
      userSockets.get(uid).add(socket.id);
      socket.data.userId = uid;
      // Join a room named "user-{id}" so controllers can emit to specific users
      // e.g. io.to(`user-${userId}`).emit('new_notification', {...})
      socket.join(`user-${uid}`);
      broadcastOnlineUsers();
    });

    socket.on('disconnect', () => {
      const uid = socket.data?.userId;
      if (uid && userSockets.has(uid)) {
        const set = userSockets.get(uid);
        set.delete(socket.id);
        if (set.size === 0) {
          userSockets.delete(uid);
        }
        broadcastOnlineUsers();
      }
    });
  });

  // Keep emitToUser accessible via returned object.


  function emitToUser(userId, event, data) {
    const uid = String(userId);
    const set = userSockets.get(uid);
    if (!set || set.size === 0) return false;
    // Emit to ALL sockets of this user (multi-tab support) via the room
    io.to(`user-${uid}`).emit(event, data);
    return true;
  }

  return { io, emitToUser };
}

module.exports = { createSocketIO };


