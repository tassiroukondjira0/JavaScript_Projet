(function () {
  // This script is loaded from the <head> and should NOT create its own socket connection.
  // It waits for window.mainSocket (created by main.js) and attaches listeners to it.
  // This avoids the bug where two separate socket connections both register the same userId,
  // causing the user to appear offline when the first connection disconnects.

  // CRITICAL: This script runs in <head> where document.body is null.
  // We MUST NOT check userId here - instead we poll for mainSocket AND body
  // before attaching.

  var _retryTimer = null;

  function tryAttach() {
    // Wait until both the socket and body are available
    if (!window.mainSocket) {
      _retryTimer = setTimeout(tryAttach, 200);
      return;
    }

    var body = document.body;
    if (!body) {
      _retryTimer = setTimeout(tryAttach, 200);
      return;
    }

    var userId = body.dataset ? body.dataset.userId : null;
    if (!userId) {
      // User not logged in, nothing to do
      return;
    }

    window.mainSocket.on('new_notification', function (data) {
      console.log('[Djokko] new_notification', data);

      var el = document.getElementById('realtimeNotificationToast');
      if (el) {
        el.textContent = '🔔 Nouvelle notification: ' + (data && data.type ? data.type : 'INFO');
        el.classList.add('show');
        setTimeout(function () { el.classList.remove('show'); }, 2500);
      }
    });
  }

  tryAttach();
})();

