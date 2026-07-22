document.addEventListener('DOMContentLoaded', () => {
  const partnersList = document.getElementById('chat-partners-list');
  const chatHeader = document.getElementById('chat-header-info');
  const chatMessages = document.getElementById('chat-messages-container');
  const chatForm = document.getElementById('chat-form');
  const chatInput = document.getElementById('chat-input-message');

  let activePartnerId = null;
  let onlineUserIds = [];

  // 1. Check if user_id query parameter is in URL (pre-selected chat partner)
  const urlParams = new URLSearchParams(window.location.search);
  const preSelectedId = parseInt(urlParams.get('user_id'));

  // Listen for new messages from socket.js
  document.addEventListener('message_received', (e) => {
    const msg = e.detail;
    
    // If message is from current active partner, append to chat
    if (activePartnerId && msg.sender_id === activePartnerId) {
      appendMessageBubble(msg, 'received');
      scrollToBottom();
    }
    
    // Refresh conversation list to show last message
    loadConversations();
  });

  // Typing indicator
  let typingTimeout = null;

  function setTypingIndicator(shouldShow, partnerId) {
    const el = document.getElementById('chat-typing-indicator');
    if (!el) return;

    if (!shouldShow) {
      el.textContent = '';
      el.style.display = 'none';
      return;
    }

    // Only show for active partner
    if (partnerId !== activePartnerId) return;
    el.textContent = `${window.currentUser && window.currentUser.lang === 'en' ? 'Typing…' : 'En train d’écrire…'}`;
    el.style.display = 'block';
  }

  // Listen for socket online status list updates
  document.addEventListener('DOMContentLoaded', () => {
    // If online status list updates are broadcated
  });

  // Hook into mainSocket if available

  const checkSocket = setInterval(() => {
    if (window.mainSocket) {
      clearInterval(checkSocket);
      
      // Receive online list updates
      window.mainSocket.on('online_users_list', (activeIds) => {
        onlineUserIds = activeIds;
        updateChatHeaderOnlineStatus();
        updateConversationsOnlineIndicators();
      });

      // Typing events
      window.mainSocket.on('typing', (payload) => {
        if (!payload) return;
        if (!activePartnerId) return;
        if (payload.senderId !== activePartnerId && payload.receiverId !== window.currentUser.id) {
          // allow only when conversation matches
        }
        // show only if sender is the active partner
        if (payload.senderId === activePartnerId) {
          setTypingIndicator(true, payload.senderId);
        }
      });

      window.mainSocket.on('stop_typing', (payload) => {
        if (!payload) return;
        if (payload.senderId === activePartnerId) {
          setTypingIndicator(false, payload.senderId);
        }
      });

      // Read receipts
      window.mainSocket.on('message_read', (payload) => {
        if (!payload || !payload.messageId) return;
        // Update bubble status for sent messages
        updateMessageReadUI(payload);
      });
    }
  }, 100);


  function setMobileMode(isChatOpen) {
    // On mobile, CSS masque la fenêtre chat par défaut. Ici on bascule liste <-> conversation.
    // (Sur desktop, pas d'impact.)
    const isMobile = window.matchMedia('(max-width: 640px)').matches;
    if (!isMobile) return;

    const chatWindowEl = document.querySelector('.chat-window');
    const listPanelEl = document.querySelector('.chat-list-panel');
    if (!chatWindowEl || !listPanelEl) return;

    if (isChatOpen) {
      listPanelEl.style.display = 'none';
      chatWindowEl.style.display = 'flex';
    } else {
      listPanelEl.style.display = 'flex';
      chatWindowEl.style.display = 'none';
    }
  }

  async function initChat() {
    await loadConversations();

    // Si preselected partner depuis URL => ouvrir la discussion
    if (preSelectedId) {
      setMobileMode(true);
      await openChatWith(preSelectedId);
      return;
    }

    // Par défaut mobile => liste visible
    setMobileMode(false);
  }


  // Load chat partners list
  async function loadConversations() {
    if (!partnersList) return;

    try {
      const res = await fetch('/api/messages/partners');
      const partners = await res.json();

      // Nombre de messages non lus par discussion (via notifications non lues)
      // On considère : notif.type === 'message' et entity_id = id du partenaire
      let unreadByPartner = {};
      try {
        const nRes = await fetch('/api/notifications');
        if (nRes.ok) {
          const notifs = await nRes.json();
          const unreadNotifs = notifs.filter(n => !n.is_read && n.type === 'message');
          unreadByPartner = unreadNotifs.reduce((acc, n) => {
            const partnerId = String(n.entity_id);
            acc[partnerId] = (acc[partnerId] || 0) + 1;
            return acc;
          }, {});
        }
      } catch (e) {
        // ignore
      }

      // If pre-selected partner is NOT in partners list, we must fetch their info and prepend them
      if (preSelectedId && !partners.some(p => p.id === preSelectedId)) {
        const userRes = await fetch(`/api/users/profile/${preSelectedId}`);
        if (userRes.ok) {
          const userData = await userRes.json();
          partners.unshift({
            id: userData.user.id,
            fullname: userData.user.fullname,
            profile_picture: userData.user.profile_picture,
            last_message: 'Nouvelle discussion...',
            last_message_time: new Date().toISOString()
          });
        }
      }

      if (partners.length === 0) {
        partnersList.innerHTML = `<p style="color: var(--text-muted); font-size: 0.85rem; text-align: center; padding: 20px 0;">Aucune discussion active</p>`;
        return;
      }

      partnersList.innerHTML = partners.map(p => {
        const isOnline = onlineUserIds.includes(p.id);
        const statusClass = isOnline ? '<div class="status-dot"></div>' : '';
        const activeClass = activePartnerId === p.id ? 'active' : '';
        const avatar = p.profile_picture ? `/uploads/${p.profile_picture}` : '/images/default-avatar.svg';

        const unreadCount = unreadByPartner[String(p.id)] || 0;
        const unreadBadge = unreadCount > 0
          ? `<span style="display:inline-flex; align-items:center; justify-content:center; margin-left:8px; background: var(--primary); color: var(--badge-text); border-radius:999px; padding:2px 6px; font-size:0.7rem; font-weight:700; flex: 0 0 auto;">${unreadCount}</span>`
          : '';

        return `
          <div class="chat-partner-item ${activeClass}" data-id="${p.id}" id="partner-item-${p.id}">
            <div class="avatar-container">
              <img src="${avatar}" onerror="this.src='/images/default-avatar.svg'" alt="Avatar" class="avatar avatar-sm">
              ${statusClass}
            </div>
            <div style="flex: 1; overflow: hidden;">
              <div style="display:flex; align-items:center;">
                <div style="font-weight: 600; font-size: 0.9rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${p.fullname}</div>
                ${unreadBadge}
              </div>
              <div style="font-size: 0.75rem; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                ${p.last_message || ''}
              </div>
            </div>
          </div>
        `;
      }).join('');

      // Add click listeners to chat items
      document.querySelectorAll('.chat-partner-item').forEach(item => {
        item.addEventListener('click', () => {
          const partnerId = parseInt(item.dataset.id);
          openChatWith(partnerId);
        });
      });

    } catch (err) {
      console.error('Error loading chat partners:', err);
    }
  }

  // Open Chat history with selected user
  async function openChatWith(partnerId) {
    activePartnerId = partnerId;

    // Mobile: masquer la liste
    setMobileMode(true);

    
    // Highlight active partner in list
    document.querySelectorAll('.chat-partner-item').forEach(item => {
      item.classList.remove('active');
    });
    const partnerEl = document.getElementById(`partner-item-${partnerId}`);
    if (partnerEl) partnerEl.classList.add('active');

    // Fetch user details for header
    try {
      const userRes = await fetch(`/api/users/profile/${partnerId}`);
      if (!userRes.ok) return;
      const userData = await userRes.json();
      const user = userData.user;

      const avatar = user.profile_picture ? `/uploads/${user.profile_picture}` : '/images/default-avatar.svg';
      const isOnline = onlineUserIds.includes(user.id);
      const onlineText = isOnline ? 'En ligne' : 'Hors ligne';
      const onlineColor = isOnline ? 'var(--accent-color)' : 'var(--text-muted)';

      // Render Chat Header info
      const backBtn = window.matchMedia('(max-width: 640px)').matches
        ? `<button type="button" id="chat-back-to-list" class="btn btn-secondary" style="padding: 10px 14px; font-size: 0.9rem;">←</button>`
        : '';

      chatHeader.innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px; width: 100%;">
          ${backBtn}
          <img src="${avatar}" onerror="this.src='/images/default-avatar.svg'" alt="Avatar" class="avatar">
          <div style="display: flex; flex-direction: column; flex: 1; min-width: 0;">
            <a href="/profile/${user.id}" style="font-weight: 600; text-decoration: none; color: var(--text-main);">${user.fullname}</a>
            <span style="font-size: 0.75rem; color: ${onlineColor}; font-weight: 500;" id="chat-header-status">${onlineText}</span>
          </div>
        </div>
      `;

      // Mobile back button
      const backEl = document.getElementById('chat-back-to-list');
      if (backEl) {
        backEl.addEventListener('click', () => {
          setMobileMode(false);
        });
      }


      // Fetch chat messages history
      const historyRes = await fetch(`/api/messages/history/${partnerId}`);
      const messages = await historyRes.json();

      // Show panels
      chatMessages.style.display = 'flex';
      chatForm.style.display = 'flex';

      // Render Messages
      chatMessages.innerHTML = '';
      if (messages.length === 0) {
        chatMessages.innerHTML = `<div style="text-align: center; color: var(--text-muted); font-size: 0.85rem; padding: 20px 0;">Le début de votre conversation.</div>`;
      } else {
        messages.forEach(m => {
          const type = m.sender_id === window.currentUser.id ? 'sent' : 'received';
          appendMessageBubble(m, type);
        });
      }

      scrollToBottom();
      chatInput.focus();

    } catch (err) {
      console.error('Error opening chat:', err);
    }
  }

  function updateMessageReadUI(payload) {
    // payload: { messageId, senderId, receiverId }
    // We only update messages sent by current user (so current user should display read state)
    const bubble = document.querySelector(`[data-message-id="${payload.messageId}"]`);
    if (!bubble) return;

    const readEl = bubble.querySelector('.chat-msg-read');
    if (readEl) {
      readEl.textContent = window.currentUser && window.currentUser.lang === 'en' ? 'Read ✓' : 'Lu ✓';
      readEl.style.display = 'inline';
    }
  }

  function appendMessageBubble(m, type) {
    // Show container on mobile just in case
    if (chatMessages) chatMessages.style.display = 'flex';


    // Check if the placeholder div is still there
    if (chatMessages.querySelector('div[style*="text-align: center"]')) {
      chatMessages.innerHTML = '';
    }


    const bubble = document.createElement('div');
    bubble.className = `chat-msg-bubble ${type}`;
    
    const formattedTime = new Date(m.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    bubble.innerHTML = `
      <div>${escapeHTML(m.content)}</div>
      <div class="chat-msg-time" style="display:flex; align-items:center; gap:8px; justify-content:flex-end;">
        <span>${formattedTime}</span>
        <span class="chat-msg-read" data-read-status="0" style="display:none; font-size:0.75rem; color: var(--accent-color); font-weight:700;">Lu ✓</span>
      </div>
    `;

    bubble.dataset.messageId = String(m.id);


    chatMessages.appendChild(bubble);
  }

  function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  // Update Header Online Status
  function updateChatHeaderOnlineStatus() {
    const statusEl = document.getElementById('chat-header-status');
    if (!statusEl || !activePartnerId) return;

    const isOnline = onlineUserIds.includes(activePartnerId);
    statusEl.textContent = isOnline ? 'En ligne' : 'Hors ligne';
    statusEl.style.color = isOnline ? 'var(--accent-color)' : 'var(--text-muted)';
  }

  // Update online indicators in partners list
  function updateConversationsOnlineIndicators() {
    document.querySelectorAll('.chat-partner-item').forEach(item => {
      const pid = parseInt(item.dataset.id);
      const container = item.querySelector('.avatar-container');
      const existingDot = container.querySelector('.status-dot');
      
      const isOnline = onlineUserIds.includes(pid);
      if (isOnline && !existingDot) {
        const dot = document.createElement('div');
        dot.className = 'status-dot';
        container.appendChild(dot);
      } else if (!isOnline && existingDot) {
        existingDot.remove();
      }
    });
  }

  // Emit typing status
  if (chatInput) {
    let lastTypingAt = 0;

    chatInput.addEventListener('input', () => {
      if (!activePartnerId || !window.mainSocket) return;

      const now = Date.now();
      lastTypingAt = now;
      window.mainSocket.emit('typing', { receiverId: activePartnerId });

      if (typingTimeout) clearTimeout(typingTimeout);
      typingTimeout = setTimeout(() => {
        // stop typing after a short inactivity
        if (window.mainSocket && activePartnerId) {
          window.mainSocket.emit('stop_typing', { receiverId: activePartnerId });
        }
        setTypingIndicator(false, activePartnerId);
      }, 900);
    });
  }

  // Handle Send Message Submit
  if (chatForm) {
    chatForm.addEventListener('submit', async (e) => {

      e.preventDefault();
      const content = chatInput.value.trim();
      if (!content || !activePartnerId) return;

      try {
        const res = await fetch('/api/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ receiver_id: activePartnerId, content })
        });

        const data = await res.json();

        if (res.ok) {
          // stop typing before sending
          if (window.mainSocket && activePartnerId) {
            window.mainSocket.emit('stop_typing', { receiverId: activePartnerId });
          }

          chatInput.value = '';
          appendMessageBubble(data, 'sent');
          scrollToBottom();
          loadConversations(); // refresh sidebar to show last message
        }

      } catch (err) {
        console.error('Error sending message:', err);
      }
    });
  }

  // Helper
  function escapeHTML(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Init
  setTimeout(() => {
    if (window.currentUser) {
      initChat();
    } else {
      const checkUser = setInterval(() => {
        if (window.currentUser) {
          clearInterval(checkUser);
          initChat();
        }
      }, 100);
    }
  }, 100);
});
