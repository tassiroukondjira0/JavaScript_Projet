// Global variables
window.currentUser = null;
window.mainSocket = null;

const IDLE_TIMEOUT_MS = 3 * 60 * 1000; // 3 minutes
let idleLogoutTimer = null;

// Ensure fetch sends cookies for same-origin requests so session cookies remain available.
const originalFetch = window.fetch.bind(window);
window.fetch = (url, options = {}) => originalFetch(url, {
  credentials: 'include',
  ...options
});

function setupIdleLogout() {
  const doIdleLogout = async () => {
    showNotificationToast({
      type: 'idle_logout',
      sender_name: 'Système',
      sender_picture: null
    });

    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error('Idle logout failed:', err);
    }

    setTimeout(() => {
      window.location.href = '/login';
    }, 1200);
  };

  const resetIdleTimer = () => {
    if (idleLogoutTimer) {
      clearTimeout(idleLogoutTimer);
    }
    idleLogoutTimer = setTimeout(doIdleLogout, IDLE_TIMEOUT_MS);
  };

  ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'].forEach(event => {
    window.addEventListener(event, resetIdleTimer, { passive: true });
  });

  resetIdleTimer();
}

function applyTheme(theme) {
  const root = document.documentElement;
  const finalTheme = theme === 'light' || theme === 'dark' ? theme : 'dark';
  root.dataset.theme = finalTheme;
}

function initTheme() {
  try {
    const saved = window.localStorage.getItem('theme');
    if (saved === 'light' || saved === 'dark') {
      applyTheme(saved);
      return;
    }

    const prefersLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
    applyTheme(prefersLight ? 'light' : 'dark');
  } catch (e) {
    applyTheme('dark');
  }
}

async function initMainPage() {
  // Init theme even on auth pages
  initTheme();

  // Ignore auth pages for the rest (header/socket/etc.)
  const isAuthPage = window.location.pathname.startsWith('/login') || window.location.pathname.startsWith('/register') || window.location.pathname.startsWith('/auth');
  if (isAuthPage) return;

  setupIdleLogout();

  try {
    // 1. Load current user from server-provided data or API
    if (window.__DJOKKO_USER__ && window.__DJOKKO_USER__.id) {
      window.currentUser = window.__DJOKKO_USER__;
    } else {
      const res = await fetch('/api/auth/me');
      if (!res.ok) {
        window.location.href = '/login';
        return;
      }
      window.currentUser = await res.json();
    }

    // Apply user's preferred theme from server
    if (window.currentUser.preferred_theme) {
      applyTheme(window.currentUser.preferred_theme);
      try {
        window.localStorage.setItem('theme', window.currentUser.preferred_theme);
      } catch (e) {}
    }

    // 2. Render top navigation header (Facebook-style)
    renderTopHeader();

    // 3. Render Right Sidebar
    renderRightSidebar();

    // 4. Connect to Socket.IO
    initSocket();

    // 5. Load initial notifications
    loadNotifications();

    // 6. Setup search functionality
    initSearch();

    // 7. Update unread badges (notifications/messages)
    updateNavBadges();
  } catch (err) {
    console.error('Error initializing layout:', err);
    window.location.href = '/login';
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initMainPage);
  window.addEventListener('pageshow', () => {
    if (typeof updateNavBadges === 'function') updateNavBadges();
  });
} else {
  initMainPage();
}

function renderTopHeader() {
  const placeholder = document.getElementById('header-placeholder');
  if (!placeholder) return;

  const currentPath = window.location.pathname;
  const isAdmin = window.currentUser.is_admin === 1 || window.currentUser.is_admin === true;
  const avatarSrc = window.currentUser.profile_picture ? `/uploads/${window.currentUser.profile_picture}` : '/images/default-avatar.svg';

  const isActive = (path) => currentPath.startsWith(path) ? 'active' : '';

  placeholder.innerHTML = `
    <header class="fb-header">
      <!-- Left: Logo -->
      <div class="fb-header-left">
        <a href="/posts" class="fb-header-logo">Djokko</a>
      </div>

      <!-- Center: Search bar + Navigation icons -->
      <div class="fb-header-center">
        <div class="fb-search-wrap">
          <svg class="fb-search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          <input type="text" id="global-search-input" class="fb-search-input" placeholder="Rechercher sur Djokko" />
          <div id="search-results-dropdown" class="search-results-dropdown"></div>
        </div>
        <nav class="fb-header-nav">
          <a href="/posts" class="fb-nav-btn ${isActive('/posts')}" title="Accueil">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
          </a>
          <a href="/friends" class="fb-nav-btn ${isActive('/friends')}" title="Amis">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
            <span id="nav-friends-badge" class="fb-nav-badge" style="display:none;">0</span>
          </a>
          <a href="/messages" class="fb-nav-btn ${isActive('/messages')}" title="Messages">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
            <span id="nav-messages-badge" class="fb-nav-badge" style="display:none;">0</span>
          </a>
          <a href="/notifications" class="fb-nav-btn ${isActive('/notifications')}" title="Notifications">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 7h18s-3 0-3-7"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
            <span id="nav-notifs-badge" class="fb-nav-badge" style="display:none;">0</span>
          </a>
          ${isAdmin ? `<a href="/admin" class="fb-nav-btn ${isActive('/admin')}" title="Administration">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
          </a>` : ''}
        </nav>
      </div>

      <!-- Right: Profile menu -->
      <div class="fb-header-right">
        <div class="profile-menu-wrapper">
          <button id="profile-menu-toggle" class="fb-header-profile" type="button" aria-expanded="false" aria-controls="profile-menu-panel">
            <img src="${avatarSrc}" onerror="this.src='/images/default-avatar.svg'" alt="Avatar" />
            <span class="fb-header-profile-name">${window.currentUser.fullname}</span>
          </button>
          <div id="profile-menu-panel" class="profile-menu-panel" hidden>
            <div class="profile-panel-header">
              <img src="${avatarSrc}" onerror="this.src='/images/default-avatar.svg'" alt="Avatar" class="avatar avatar-md">
              <div>
                <div class="user-widget-name">${window.currentUser.fullname}</div>
                <div class="user-widget-role">${isAdmin ? 'Administrateur' : 'Membre'}</div>
              </div>
            </div>
            <div class="profile-panel-meta">
              <span>${window.currentUser.email || 'Aucun email'}</span>
            </div>
            <div class="profile-panel-actions">
              <a href="/dashboard" class="profile-menu-item">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                Modifier le profil
              </a>
              <button id="btn-toggle-theme" class="profile-menu-item" type="button">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"></circle><path d="M12 1v2"></path><path d="M12 21v2"></path><path d="M4.22 4.22l1.42 1.42"></path><path d="M18.36 18.36l1.42 1.42"></path><path d="M1 12h2"></path><path d="M21 12h2"></path><path d="M4.22 19.78l1.42-1.42"></path><path d="M18.36 5.64l1.42-1.42"></path></svg>
                <span id="theme-toggle-label">Mode sombre/clair</span>
              </button>
              <a href="#" id="btn-logout" class="profile-menu-item logout-item">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                Déconnexion
              </a>
            </div>
          </div>
        </div>
      </div>
    </header>
  `;

  // Theme toggle
  const btnToggleTheme = document.getElementById('btn-toggle-theme');
  if (btnToggleTheme) {
    btnToggleTheme.addEventListener('click', () => {
      const current = document.documentElement.dataset.theme || 'dark';
      const next = current === 'light' ? 'dark' : 'light';
      applyTheme(next);
      try { window.localStorage.setItem('theme', next); } catch (e) {}
      const label = next === 'light' ? 'Mode clair' : 'Mode sombre';
      document.getElementById('theme-toggle-label').textContent = label;
    });
  }

  // Profile menu toggle
  const profileMenuToggle = document.getElementById('profile-menu-toggle');
  const profileMenuPanel = document.getElementById('profile-menu-panel');
  if (profileMenuToggle && profileMenuPanel) {
    const closeProfileMenu = () => {
      profileMenuPanel.hidden = true;
      profileMenuToggle.setAttribute('aria-expanded', 'false');
    };
    profileMenuToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      const isHidden = profileMenuPanel.hasAttribute('hidden');
      if (isHidden) {
        profileMenuPanel.hidden = false;
        profileMenuToggle.setAttribute('aria-expanded', 'true');
      } else {
        closeProfileMenu();
      }
    });
    document.addEventListener('click', (event) => {
      if (!profileMenuToggle.contains(event.target) && !profileMenuPanel.contains(event.target)) {
        closeProfileMenu();
      }
    });
  }

  // Logout
  document.getElementById('btn-logout').addEventListener('click', async (e) => {
    e.preventDefault();
    if (confirm('Voulez-vous vraiment vous déconnecter ?')) {
      await fetch('/api/auth/logout', { method: 'POST' });
      window.location.href = '/login';
    }
  });
}

// Render Right Sidebar Layout (Facebook-style contacts + notifications)
function renderRightSidebar() {
  const placeholder = document.getElementById('right-sidebar-placeholder');
  if (!placeholder) return;
  if (placeholder.closest('.app-container') &&
      getComputedStyle(placeholder).display === 'none') return;

  placeholder.innerHTML = `
    <div class="fb-right-inner">
      <!-- Contacts section title -->
      <div class="fb-right-section-title">Contacts</div>

      <!-- Contacts list -->
      <div id="online-friends-list"></div>

      <!-- Notifications widget -->
      <div class="fb-right-section-title" style="padding-top:16px;">Notifications</div>
      <div id="notifications-fb-list">
        <p style="color: var(--text-muted); font-size: 0.85rem; text-align: center; padding: 20px 0;">Aucune notification</p>
      </div>
      <button id="btn-clear-notifications" style="background:none;border:none;color:var(--primary);font-size:13px;cursor:pointer;font-weight:500;padding:8px;text-align:left;border-radius:8px;transition:background .15s ease;" onmouseover="this.style.background='var(--hover-bg)'" onmouseout="this.style.background='transparent'">Marquer tout comme lu</button>
    </div>
  `;

  document.getElementById('btn-clear-notifications').addEventListener('click', async () => {
    const res = await fetch('/api/notifications/read-all', { method: 'PUT' });
    if (res.ok) loadNotifications();
  });
}

// Socket.io initialization
function initSocket() {
  if (typeof io === 'undefined') {
    console.error('Socket.io library not loaded!');
    return;
  }

  window.mainSocket = io();

  // Register user id
  window.mainSocket.emit('register', window.currentUser.id);

  // Online users list update
  window.mainSocket.on('online_users_list', (activeIds) => {
    updateOnlineFriends(activeIds);
  });

  // Real-time notifications
  window.mainSocket.on('new_notification', (notif) => {
    showNotificationToast(notif);
    loadNotifications();
    const event = new CustomEvent('notification_received', { detail: notif });
    document.dispatchEvent(event);
  });

  // Friend relation update
  window.mainSocket.on('friendship_updated', () => {
    document.dispatchEvent(new CustomEvent('friendship_changed'));
    window.mainSocket.emit('register', window.currentUser.id);
  });

  // Private messages trigger
  window.mainSocket.on('private_message', (msg) => {
    const event = new CustomEvent('message_received', { detail: msg });
    document.dispatchEvent(event);
  });
}

// Fetch and render notifications
async function loadNotifications() {
  const container = document.getElementById('notifications-list-container');
  const fbContainer = document.getElementById('notifications-fb-list');
  if (!container && !fbContainer) return;

  try {
    const res = await fetch('/api/notifications');
    const notifs = await res.json();

    // Render for legacy container (e.g. notifications page)
    if (container) {
      if (notifs.length === 0) {
        container.innerHTML = `<p style="color: var(--text-muted); font-size: 0.85rem; text-align: center; padding: 20px 0;">Aucune notification</p>`;
      } else {
        container.innerHTML = notifs.map(n => {
          let icon = '';
          let text = '';
          let targetUrl = '#';
          const senderName = `<span>${n.sender_name}</span>`;
          switch (n.type) {
            case 'like': icon = '❤️'; text = `${senderName} a aimé votre publication.`; targetUrl = `/#post-${n.entity_id}`; break;
            case 'comment': icon = '💬'; text = `${senderName} a commenté votre publication.`; targetUrl = `/#post-${n.entity_id}`; break;
            case 'comment_reply': icon = '💬'; text = `${senderName} a répondu à votre commentaire.`; targetUrl = `/#post-${n.entity_id}`; break;
            case 'friend_request': icon = '👥'; text = `${senderName} vous a envoyé une demande d'ami.`; targetUrl = '/friends'; break;
            case 'friend_accept': icon = '✅'; text = `${senderName} a accepté votre demande d'ami.`; targetUrl = `/profile/${n.entity_id}`; break;
            case 'message': icon = '✉️'; text = `${senderName} vous a envoyé un message.`; targetUrl = '/messages'; break;
          }
          const avatarSrc = n.sender_picture ? `/uploads/${n.sender_picture}` : '/images/default-avatar.svg';
          return `<div class="notification-item ${n.is_read ? '' : 'unread'}" data-id="${n.id}" data-url="${targetUrl}">
            <img src="${avatarSrc}" onerror="this.src='/images/default-avatar.svg'" alt="Avatar" class="avatar avatar-sm">
            <div class="notification-info"><div class="notification-text">${text}</div>
            <div style="font-size: 0.7rem; color: var(--text-muted);">${formatTime(n.created_at)}</div></div>
            <div style="margin-left: auto; font-size: 1.1rem; display: flex; align-items: center;">${icon}</div>
          </div>`;
        }).join('');
      }
    }

    // Render for Facebook-style right sidebar (compact)
    if (fbContainer) {
      if (notifs.length === 0) {
        fbContainer.innerHTML = `<p style="color: var(--text-muted); font-size: 0.85rem; text-align: center; padding: 20px 0;">Aucune notification</p>`;
      } else {
        fbContainer.innerHTML = notifs.slice(0, 5).map(n => {
          let text = '';
          switch (n.type) {
            case 'like': text = `a aimé votre publication.`; break;
            case 'comment': text = `a commenté votre publication.`; break;
            case 'friend_request': text = `vous a envoyé une demande d'ami.`; break;
            case 'friend_accept': text = `a accepté votre demande d'ami.`; break;
            case 'message': text = `vous a envoyé un message.`; break;
            default: text = `a envoyé une mise à jour.`; break;
          }
          const avatarSrc = n.sender_picture ? `/uploads/${n.sender_picture}` : '/images/default-avatar.svg';
          return `<div class="notification-item ${n.is_read ? '' : 'unread'}" data-id="${n.id}" style="padding:6px 8px;font-size:13px;border-bottom:none;">
            <img src="${avatarSrc}" onerror="this.src='/images/default-avatar.svg'" alt="Avatar" style="width:28px;height:28px;border-radius:50%;object-fit:cover;">
            <div class="notification-info"><div class="notification-text" style="font-size:13px;"><strong>${n.sender_name}</strong> ${text}</div></div>
          </div>`;
        }).join('');
      }
    }

    // Add click handlers to all notification items
    document.querySelectorAll('.notification-item').forEach(item => {
      item.addEventListener('click', async () => {
        const id = item.dataset.id;
        const url = item.dataset.url;
        await fetch(`/api/notifications/read/${id}`, { method: 'PUT' });
        if (url !== '#') window.location.href = url;
        else loadNotifications();
      });
    });
  } catch (err) {
    console.error('Error loading notifications:', err);
  }
}
// Format time
function formatTime(isoString) {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'À l\'instant';
  if (diffMins < 60) return `Il y a ${diffHours} h`;
  if (diffHours < 24) return `Il y a ${diffDays} j`;
  if (diffDays < 7) return `Il y a ${diffDays} j`;
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

// Update online friends list
async function updateOnlineFriends(activeIds) {
  const container = document.getElementById('online-friends-list');
  const countBadge = document.getElementById('online-count');
  if (!container) return;

  try {
    const res = await fetch('/api/friends/list');
    const friends = await res.json();
    const onlineFriends = friends.filter(f => activeIds.map(String).includes(String(f.id)));

    if (countBadge) countBadge.textContent = onlineFriends.length;

    if (onlineFriends.length === 0) {
      container.innerHTML = `<p style="color: var(--text-muted); font-size: 0.85rem; text-align: center; padding: 16px 8px;">Aucun ami en ligne</p>`;
      return;
    }

    container.innerHTML = onlineFriends.map(f => {
      const avatarSrc = f.profile_picture ? `/uploads/${f.profile_picture}` : '/images/default-avatar.svg';
      return `
        <a href="/profile/${f.id}" class="fb-contact-item">
          <div class="fb-contact-avatar">
            <img src="${avatarSrc}" onerror="this.src='/images/default-avatar.svg'" alt="Avatar" />
            <div class="fb-contact-dot"></div>
          </div>
          <span class="fb-contact-name">${f.fullname}</span>
        </a>
      `;
    }).join('');
  } catch (err) {
    console.error('Error updating online friends:', err);
  }
}

// Initialize search functionality
function initSearch() {
  const searchInput = document.getElementById('global-search-input');
  const dropdown = document.getElementById('search-results-dropdown');
  if (!searchInput || !dropdown) return;

  let timeout = null;

  searchInput.addEventListener('input', () => {
    clearTimeout(timeout);
    const val = searchInput.value.trim();
    if (val === '') {
      dropdown.style.display = 'none';
      return;
    }
    timeout = setTimeout(async () => {
      try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(val)}`);
        const users = await res.json();
        if (users.length === 0) {
          dropdown.innerHTML = `<div style="padding: 12px; color: var(--text-muted); font-size: 0.85rem; text-align: center;">Aucun résultat</div>`;
        } else {
           dropdown.innerHTML = users.map(u => {
            const avatarSrc = u.profile_picture ? `/uploads/${u.profile_picture}` : '/images/default-avatar.svg';
            const isPrivileged = window.currentUser && (window.currentUser.is_admin || window.currentUser.is_super_admin);
            const emailLine = (isPrivileged && u.email)
              ? `<span style="font-size: 0.75rem; color: var(--text-muted);">${u.email}</span>`
              : `<span style="font-size: 0.75rem; color: var(--text-muted);">@${u.id}</span>`;
            return `
              <a href="/profile/${u.id}" class="search-result-item">
                <img src="${avatarSrc}" onerror="this.src='/images/default-avatar.svg'" alt="Avatar" class="avatar avatar-sm">
                <div style="display: flex; flex-direction: column;">
                  <span style="font-weight: 600; font-size: 0.9rem;">${u.fullname}</span>
                  ${emailLine}
                </div>
              </a>
            `;
          }).join('');
        }
        dropdown.style.display = 'block';
      } catch (err) {
        console.error('Error during search:', err);
      }
    }, 300);
  });

  document.addEventListener('click', (e) => {
    if (!searchInput.contains(e.target) && !dropdown.contains(e.target)) {
      dropdown.style.display = 'none';
    }
  });
}

// Update navigation badges
async function updateNavBadges() {
  const notifsBadge = document.getElementById('nav-notifs-badge');
  const messagesBadge = document.getElementById('nav-messages-badge');

  if (!notifsBadge && !messagesBadge) return;

  try {
    const res = await fetch('/api/notifications');
    if (!res.ok) return;
    const notifs = await res.json();

    const unreadNotifs = notifs.filter(n => !n.is_read);
    const unreadMessages = unreadNotifs.filter(n => n.type === 'message');

    const setBadge = (el, value) => {
      if (!el) return;
      const v = Number(value) || 0;
      el.style.display = v > 0 ? 'inline-flex' : 'none';
      el.textContent = String(v);
    };

    setBadge(notifsBadge, unreadNotifs.length);
    setBadge(messagesBadge, unreadMessages.length);
  } catch (e) {
    console.error('updateNavBadges failed:', e);
  }
}

// Display floating toast notification
function showNotificationToast(notif) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.style.position = 'fixed';
    container.style.bottom = '24px';
    container.style.right = '24px';
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.gap = '12px';
    container.style.zIndex = '9999';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = 'glass-card';
  toast.style.padding = '14px 20px';
  toast.style.borderRadius = 'var(--radius-sm)';
  toast.style.display = 'flex';
  toast.style.alignItems = 'center';
  toast.style.gap = '12px';
  toast.style.boxShadow = 'var(--shadow-lg)';
  toast.style.borderLeft = '4px solid var(--primary-color)';
  toast.style.animation = 'slideIn 0.3s cubic-bezier(0.18, 0.89, 0.32, 1.28)';
  toast.style.width = '300px';

  let text = '';
  switch (notif.type) {
    case 'like':
      text = `<strong>${notif.sender_name}</strong> a aimé votre publication.`;
      break;
    case 'comment':
      text = `<strong>${notif.sender_name}</strong> a commenté votre publication.`;
      break;
    case 'comment_reply':
      text = `<strong>${notif.sender_name}</strong> a répondu à votre commentaire.`;
      break;
    case 'friend_request':
      text = `<strong>${notif.sender_name}</strong> vous a envoyé une demande d'ami.`;
      break;
    case 'friend_accept':
      text = `<strong>${notif.sender_name}</strong> a accepté votre demande d'ami.`;
      break;
    case 'message':
      text = `<strong>${notif.sender_name}</strong> vous a envoyé un message.`;
      break;
    case 'idle_logout':
      text = `Vous avez été déconnecté(e) automatiquement après 3 minutes d'inactivité.`;
      break;
    default:
      text = notif.sender_name ? `<strong>${notif.sender_name}</strong> a envoyé une mise à jour.` : 'Vous avez été déconnecté(e) automatiquement.';
      break;
  }

  const avatarSrc = notif.sender_picture ? `/uploads/${notif.sender_picture}` : '/images/default-avatar.svg';

  toast.innerHTML = `
    <img src="${avatarSrc}" onerror="this.src='/images/default-avatar.svg'" alt="Avatar" class="avatar avatar-sm">
    <div style="flex: 1; font-size: 0.85rem; line-height: 1.4;">${text}</div>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(20px)';
    toast.style.transition = 'all 0.4s ease';
    setTimeout(() => toast.remove(), 400);
  }, 4000);
}