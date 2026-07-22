// Keep track of active connections
// Map of userId -> Set of socketIds
const onlineUsers = new Map();

module.exports = (io) => {
  io.on('connection', (socket) => {
    let currentUserId = null;

    // Handle user registration
    socket.on('register', (userId) => {
      if (!userId) return;
      currentUserId = parseInt(userId);
      
      // Associate socket with user room
      socket.join(`user-${currentUserId}`);

      // Add socket to online users mapping
      if (!onlineUsers.has(currentUserId)) {
        onlineUsers.set(currentUserId, new Set());
      }
      onlineUsers.get(currentUserId).add(socket.id);

      // Broadcast updated online users list
      sendOnlineUsersList();
    });

    // Typing indicator
    // client emits: socket.emit('typing', { receiverId }) while typing in conversation
    socket.on('typing', (payload) => {
      try {
        if (!currentUserId) return;
        const receiverId = payload && payload.receiverId ? parseInt(payload.receiverId) : null;
        if (!receiverId) return;

        // Tell receiver that sender is typing
        io.to(`user-${receiverId}`).emit('typing', {
          senderId: currentUserId,
          receiverId,
          created_at: new Date().toISOString()
        });
      } catch (_) {}
    });

    // client emits: socket.emit('stop_typing', { receiverId }) when stops or on send
    socket.on('stop_typing', (payload) => {
      try {
        if (!currentUserId) return;
        const receiverId = payload && payload.receiverId ? parseInt(payload.receiverId) : null;
        if (!receiverId) return;

        io.to(`user-${receiverId}`).emit('stop_typing', {
          senderId: currentUserId,
          receiverId,
          created_at: new Date().toISOString()
        });
      } catch (_) {}
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      if (currentUserId && onlineUsers.has(currentUserId)) {
        const sockets = onlineUsers.get(currentUserId);
        sockets.delete(socket.id);
        
        if (sockets.size === 0) {
          onlineUsers.delete(currentUserId);
        }
      }
      // Broadcast updated online users list
      sendOnlineUsersList();
    });

    // Helper to send the list of online user IDs
    function sendOnlineUsersList() {
      const activeIds = Array.from(onlineUsers.keys());
      io.emit('online_users_list', activeIds);
    }
  });
};

