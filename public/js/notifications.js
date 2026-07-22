async function loadNotificationsPage() {
  const list = document.getElementById('notifications-list');
  const countText = document.getElementById('notif-count-text');
  const btnMarkAllRead = document.getElementById('btn-mark-all-read');
  const btnRefresh = document.getElementById('btn-refresh-notifs');

  if (!list) return;

  const render = (notifs) => {
    const unreadCount = notifs.filter(n => !n.is_read).length;

    if (countText) {
      countText.textContent = `${unreadCount} non lue(s) • ${notifs.length} totale(s)`;
    }

    if (notifs.length === 0) {
      list.innerHTML = `<div style="text-align: center; padding: 40px;">
        <p style="color: var(--text-muted);">Aucune notification</p>
      </div>`;
      return;
    }

    list.innerHTML = notifs.map(n => {
      let icon = '';
      let text = '';
      let targetUrl = '#';

      const senderName = `<span>${n.sender_name}</span>`;

      switch (n.type) {
        case 'like':
          icon = '❤️';
          text = `${senderName} a aimé votre publication.`;
          targetUrl = `/#post-${n.entity_id}`;
          break;
        case 'comment':
          icon = '💬';
          text = `${senderName} a commenté votre publication.`;
          targetUrl = `/#post-${n.entity_id}`;
          break;
        case 'comment_reply':
          icon = '💬';
          text = `${senderName} a répondu à votre commentaire.`;
          targetUrl = `/#post-${n.entity_id}`;
          break;
        case 'reaction':
          icon = '❤️';
          text = `${senderName} a réagi à votre publication.`;
          targetUrl = `/#post-${n.entity_id}`;
          break;
        case 'share':
          icon = '🔁';
          text = `${senderName} a partagé votre publication.`;
          targetUrl = `/#post-${n.entity_id}`;
          break;

        case 'friend_request':
          icon = '👥';
          text = `${senderName} vous a envoyé une demande d'ami.`;
          targetUrl = '/friends';
          break;
        case 'friend_accept':
          icon = '✅';
          text = `${senderName} a accepté votre demande d'ami.`;
          targetUrl = `/profile/${n.entity_id}`;
          break;
        case 'message':
          icon = '✉️';
          text = `${senderName} vous a envoyé un message.`;
          targetUrl = '/messages';
          break;
      }

      const avatarSrc = n.sender_picture ? `/uploads/${n.sender_picture}` : '/images/default-avatar.svg';

      return `
        <div class="notification-item ${n.is_read ? '' : 'unread'}" data-url="${targetUrl}">
          <img src="${avatarSrc}" onerror="this.src='/images/default-avatar.svg'" alt="Avatar" class="avatar avatar-sm">
          <div class="notification-info">
            <div class="notification-text">${text}</div>
            <div style="font-size: 0.7rem; color: var(--text-muted);">${formatTime(n.created_at)}</div>
          </div>
          <div style="margin-left: auto; font-size: 1.1rem; display: flex; align-items: center;">${icon}</div>
        </div>
      `;
    }).join('');

    list.querySelectorAll('.notification-item').forEach(item => {
      item.addEventListener('click', () => {
        const url = item.dataset.url;
        if (url && url !== '#') window.location.href = url;
      });
    });
  };

  const res = await fetch('/api/notifications');
  const notifs = await res.json();
  render(notifs);

  // mark all as read
  if (btnMarkAllRead) {
    btnMarkAllRead.addEventListener('click', async () => {
      await fetch('/api/notifications/read-all', { method: 'PUT' });
      await loadNotificationsPage();

      // Supprimer aussi les badges côté menu si présents
      if (typeof window.updateNavBadges === 'function') {
        window.updateNavBadges();
      } else if (typeof updateNavBadges === 'function') {
        updateNavBadges();
      }
    });
  }

  if (btnRefresh) {
    btnRefresh.addEventListener('click', () => loadNotificationsPage());
  }
}

// Duplicate small formatter (same behavior as main.js)
function formatTime(isoString) {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffWeeks = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 7));
  const dissMonths = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30));
  const dissYears = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 365));

  if (diffMins < 1) return 'À L\'instant';
  if (diffMins < 60) return `Il y a ${diffMins} min`;
  if (diffHours < 24) return `Il y a ${diffHours} h`;
  if (diffDays < 7) return `Il y a ${diffDays} j`;
  if (diffWeeks < 4) return `Il y a ${diffWeeks} sem`;
  if (dissMonths < 12) return `Il y a ${dissMonths} mois`;
  if (dissYears >= 1) return `Il y a ${dissYears} an${dissYears > 1 ? 's' : ''}`;

  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadNotificationsPage);
} else {
  loadNotificationsPage();
}

