(function () {
  // Requires socket.io-client loaded by CDN.
  // Connect + register userId, then listen for realtime notifications.

  const userId = document.body?.dataset?.userId;
  if (!userId) return;

  // Global io is provided by socket.io-client.
  if (typeof window.io !== 'function') return;

  const socket = window.io({ transports: ['websocket'] });

  socket.on('connect', () => {
    socket.emit('register', userId);
  });

  socket.on('notification:new', (data) => {
    console.log('[Djokko] notification:new', data);

    // Minimal UI hook for now (works even without a dedicated notifications page)
    const el = document.getElementById('realtimeNotificationToast');
    if (el) {
      el.textContent = `🔔 Nouvelle notification: ${data?.type || 'INFO'}`;
      el.classList.add('show');
      setTimeout(() => el.classList.remove('show'), 2500);
    }
  });
})();

