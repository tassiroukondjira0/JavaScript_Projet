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

    // Listen for incoming notifications and dispatch a DOM event
    // so that any page component can react (e.g. refresh the notifications list).
    window.mainSocket.on('new_notification', function (data) {
      console.log('[Djokko] new_notification received via Socket.IO', data);

      // Dispatch a custom DOM event that the notifications page listens to
      var event = new CustomEvent('notification_received', { detail: data });
      document.dispatchEvent(event);
    });
  }

  tryAttach();
})();

