(function () {
  if (typeof window.io !== 'function') return;

  const user = window.__DJOKKO_USER__ || null;
  const userId = user?.id;
  if (!userId) return;

  const toast = (msg) => {
    console.log('[Djokko][Chat]', msg);
  };

  const elConvoList = document.getElementById('convoList');
  const elMsgBox = document.getElementById('msgBox');
  const elMsgInput = document.getElementById('msgInput');
  const elBtnSend = document.getElementById('btnSend');
  const elBtnLoadConvos = document.getElementById('btnLoadConvos');
  const elChatTitle = document.getElementById('chatTitle');
  const elTypingIndicator = document.getElementById('typingIndicator');
  const elBtnNewConvo = document.getElementById('btnNewConversation');
  const elNewConvoModal = document.getElementById('newConvoModal');
  const elNewConvoSearch = document.getElementById('newConvoSearch');
  const elNewConvoResults = document.getElementById('newConvoResults');
  const elBtnCloseModal = document.getElementById('btnCloseModal');
  const elMsgFileInput = document.getElementById('msgFileInput');
  const elFilePreview = document.getElementById('filePreview');
  const elFilePreviewName = document.getElementById('filePreviewName');
  const elBtnClearFile = document.getElementById('btnClearFile');

  if (!elConvoList || !elMsgBox || !elMsgInput || !elBtnSend || !elTypingIndicator) return;

  // File upload state
  let pendingFile = null; // { file, previewUrl }
  let isUploading = false;

  let socket;
  let activeConversationId = null;
  let otherUsersCache = {}; // conversationId -> { id, fullname, profile_picture }
  let onlineUserIds = [];

  function escapeHtml(str) {
    return String(str)
      .replaceAll('&', '&')
      .replaceAll('<', '<')
      .replaceAll('>', '>')
      .replaceAll('"', '"')
      .replaceAll("'", '&#039;');
  }

  // Listen for online users list
  if (window.mainSocket) {
    window.mainSocket.on('online_users_list', (activeIds) => {
      onlineUserIds = activeIds.map(String);
      // Re-render convos to show online status
      if (window.__CHAT_CONVOS_CACHE__) {
        renderConversations(window.__CHAT_CONVOS_CACHE__);
      }
    });
  }

  function isVideoFile(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    return ['mp4', 'webm', 'ogg', 'mov', 'avi'].includes(ext);
  }

  function appendMessage(msg) {
    const mine = String(msg.sender_id) === String(userId);
    const bubble = document.createElement('div');
    bubble.style.margin = '6px 0';
    bubble.style.display = 'flex';
    bubble.style.flexDirection = 'column';
    bubble.style.alignItems = mine ? 'flex-end' : 'flex-start';

    const time = msg.created_at ? new Date(msg.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '';

    let mediaHtml = '';
    if (msg.image) {
      const imgSrc = '/uploads/' + msg.image;
      if (isVideoFile(msg.image)) {
        mediaHtml = `<video src="${imgSrc}" controls style="max-width:260px;max-height:200px;border-radius:8px;margin-bottom:4px;display:block;"></video>`;
      } else {
        mediaHtml = `<img src="${imgSrc}" alt="media" style="max-width:260px;max-height:200px;border-radius:8px;margin-bottom:4px;display:block;cursor:pointer;" onclick="window.open('${imgSrc}','_blank')" />`;
      }
    }

    bubble.innerHTML = `
      <div style="max-width:75%; background:${mine ? 'var(--primary)' : 'var(--card-2)'}; color:${mine ? '#fff' : 'var(--text)'}; padding:8px 12px; border-radius:${mine ? '18px 18px 4px 18px' : '18px 18px 18px 4px'};">
        ${!mine ? '<div style="font-size:11px; opacity:.7; margin-bottom:2px;">' + escapeHtml(msg.fullname || 'Inconnu') + '</div>' : ''}
        ${mediaHtml}
        ${msg.body ? '<div style="white-space:pre-wrap; word-break:break-word;">' + escapeHtml(msg.body) + '</div>' : ''}
        <div style="font-size:10px; opacity:.5; margin-top:4px; text-align:right;">${time}</div>
      </div>
    `;
    elMsgBox.appendChild(bubble);
    elMsgBox.scrollTop = elMsgBox.scrollHeight;
  }

  async function fetchConversations() {
    const r = await fetch('/chat/conversations');
    if (!r.ok) throw new Error('fetch conversations failed');
    const data = await r.json();
    // Enrich with user info
    const convos = data.convos || [];
    for (const c of convos) {
      if (c.other_user_id) {
        try {
          const ur = await fetch('/api/users/profile/' + c.other_user_id);
          if (ur.ok) {
            const uData = await ur.json();
            otherUsersCache[c.conversation_id] = {
              id: c.other_user_id,
              fullname: uData.fullname || 'Utilisateur #' + c.other_user_id,
              profile_picture: uData.profile_picture || null
            };
          }
        } catch (e) {}
      }
    }
    return convos;
  }

  async function fetchMessages(conversationId) {
    const r = await fetch(`/chat/conversations/${conversationId}/messages`);
    if (!r.ok) throw new Error('fetch messages failed');
    const data = await r.json();
    return data.messages || [];
  }

  async function sendMessage(conversationId, body, otherUserId = null) {
    const r = await fetch(`/chat/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body })
    });
    if (!r.ok) {
      const t = await r.text();
      throw new Error(t || 'send message failed');
    }
    return r.json();
  }

  function renderConversations(convos) {
    elConvoList.innerHTML = '';

    if (!convos.length) {
      const li = document.createElement('li');
      li.textContent = 'Aucune conversation pour le moment.';
      li.className = 'muted';
      li.style.padding = '12px';
      li.style.textAlign = 'center';
      elConvoList.appendChild(li);
      return;
    }

    convos.forEach((c) => {
      const otherUserId = c.other_user_id;
      const otherUser = otherUsersCache[c.conversation_id] || null;
      const displayName = otherUser ? otherUser.fullname : 'Utilisateur #' + otherUserId;
      const avatarSrc = otherUser && otherUser.profile_picture 
        ? '/uploads/' + otherUser.profile_picture 
        : '/images/default-avatar.svg';
      const isOnline = onlineUserIds.includes(String(otherUserId));

      const li = document.createElement('li');
      li.style.marginBottom = '6px';

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.style.width = '100%';
      btn.style.display = 'flex';
      btn.style.alignItems = 'center';
      btn.style.gap = '10px';
      btn.style.padding = '10px 12px';
      btn.style.border = 'none';
      btn.style.borderRadius = '12px';
      btn.style.background = c.conversation_id === activeConversationId ? 'var(--hover-bg)' : 'transparent';
      btn.style.cursor = 'pointer';
      btn.style.textAlign = 'left';
      btn.style.color = 'var(--text)';
      btn.style.fontSize = '14px';
      btn.style.transition = 'background .15s';
      btn.onmouseover = () => btn.style.background = 'var(--hover-bg)';
      btn.onmouseout = () => {
        if (c.conversation_id !== activeConversationId) btn.style.background = 'transparent';
      };

      btn.innerHTML = `
        <div style="position:relative;flex-shrink:0;">
          <img src="${avatarSrc}" onerror="this.src='/images/default-avatar.svg'" alt="avatar" style="width:40px;height:40px;border-radius:50%;object-fit:cover;" />
          ${isOnline ? '<div style="position:absolute;bottom:0;right:0;width:12px;height:12px;border-radius:50%;background:#31a24c;border:2px solid var(--card);"></div>' : ''}
        </div>
        <div style="flex:1;overflow:hidden;">
          <div style="font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(displayName)}</div>
          <div style="font-size:12px;color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${isOnline ? 'En ligne' : 'Hors ligne'}</div>
        </div>
      `;

      btn.addEventListener('click', async () => {
        activeConversationId = c.conversation_id;
        elChatTitle.textContent = displayName;
        elMsgBox.innerHTML = '<p class="muted" style="text-align:center;padding-top:160px;">Chargement...</p>';

        // Update active styles
        elConvoList.querySelectorAll('button').forEach(b => b.style.background = 'transparent');
        btn.style.background = 'var(--hover-bg)';

        const msgs = await fetchMessages(activeConversationId);
        elMsgBox.innerHTML = '';
        msgs.forEach(appendMessage);

        // Notify read
        if (socket) {
          socket.emit('chat:read', { conversationId: activeConversationId });
        }
      });

      li.appendChild(btn);
      elConvoList.appendChild(li);
    });
  }

  // Flag to ensure we only register chat handlers once on the shared socket
  let chatHandlersRegistered = false;

  function registerChatHandlers(sock) {
    if (chatHandlersRegistered) return;
    chatHandlersRegistered = true;

    sock.on('chat:message', (payload) => {
      if (!payload) return;

      // Skip if this is an echo from our own message (already appended optimistically)
      if (String(payload.senderId) === String(userId)) {
        // Still mark as read
        if (activeConversationId) {
          sock.emit('chat:read', { conversationId: payload.conversationId });
        }
        return;
      }

      if (!activeConversationId || String(payload.conversationId) !== String(activeConversationId)) {
        // Reload convos to update unread state
        loadConvos();
        toast('Nouveau message reçu');
        return;
      }

      appendMessage({
        sender_id: payload.senderId,
        fullname: payload.senderId === userId ? 'Moi' : (otherUsersCache[activeConversationId]?.fullname || 'Contact'),
        body: payload.body,
        image: payload.image || null,
        created_at: new Date().toISOString()
      });

      // Mark read
      sock.emit('chat:read', { conversationId: payload.conversationId });
    });

    let typingTimeout2 = null;
    sock.on('chat:typing', (data) => {
      if (!data) return;
      const { conversationId, fromUserId } = data;
      if (!conversationId) return;

      if (
        activeConversationId &&
        String(conversationId) === String(activeConversationId) &&
        String(fromUserId) !== String(userId)
      ) {
        elTypingIndicator.textContent = `En train d'écrire…`;
        if (typingTimeout2) clearTimeout(typingTimeout2);
        typingTimeout2 = setTimeout(() => {
          elTypingIndicator.textContent = '';
        }, 1500);
      }
    });
  }

  function ensureSocket() {
    if (socket) {
      // Re-register userId in case socket reconnected
      if (socket.connected) {
        socket.emit('register', userId);
      }
      return socket;
    }

    // Use the main socket instance created by main.js (window.mainSocket)
    // so we don't create a second connection that would overwrite the userId registration.
    if (window.mainSocket) {
      socket = window.mainSocket;
      // Re-register userId
      if (socket.connected) {
        socket.emit('register', userId);
      } else {
        socket.once('connect', () => {
          socket.emit('register', userId);
          if (window.__CHAT_CONVOS_CACHE__) {
            renderConversations(window.__CHAT_CONVOS_CACHE__);
          }
        });
      }
      // Also re-register on reconnect
      socket.on('reconnect', () => {
        socket.emit('register', userId);
      });
    } else {
      // Fallback: wait for mainSocket instead of creating a second connection
      // Creating a second socket connection would cause double userId registration,
      // making the user appear offline to friends when the first socket disconnects.
      console.warn('[Chat] mainSocket not available yet, waiting...');
      // Poll for mainSocket to become available
      var pollInterval = setInterval(function() {
        if (window.mainSocket) {
          clearInterval(pollInterval);
          socket = window.mainSocket;
          if (socket.connected) {
            socket.emit('register', userId);
            if (window.__CHAT_CONVOS_CACHE__) {
              renderConversations(window.__CHAT_CONVOS_CACHE__);
            }
          } else {
            socket.once('connect', () => {
              socket.emit('register', userId);
              if (window.__CHAT_CONVOS_CACHE__) {
                renderConversations(window.__CHAT_CONVOS_CACHE__);
              }
            });
          }
          socket.on('reconnect', () => {
            socket.emit('register', userId);
          });
          registerChatHandlers(socket);
        }
      }, 200);
      // Return a dummy object so calls don't crash
      return { emit: function() {}, on: function() {}, connected: false };
    }

    // Register chat handlers only once - do NOT use off() to avoid removing other listeners
    registerChatHandlers(socket);

    return socket;
  }

  async function loadConvos() {
    try {
      ensureSocket();
      const convos = await fetchConversations();
      window.__CHAT_CONVOS_CACHE__ = convos;
      renderConversations(convos);
    } catch (e) {
      console.error(e);
      toast('Erreur chargement conversations');
    }
  }

  // New Conversation Modal
  if (elBtnNewConvo && elNewConvoModal && elNewConvoSearch && elNewConvoResults && elBtnCloseModal) {
    elBtnNewConvo.addEventListener('click', () => {
      elNewConvoModal.style.display = 'flex';
      elNewConvoSearch.value = '';
      elNewConvoResults.innerHTML = '';
      elNewConvoSearch.focus();
    });

    elBtnCloseModal.addEventListener('click', () => {
      elNewConvoModal.style.display = 'none';
    });

    elNewConvoModal.addEventListener('click', (e) => {
      if (e.target === elNewConvoModal) {
        elNewConvoModal.style.display = 'none';
      }
    });

    let searchTimeout = null;
    elNewConvoSearch.addEventListener('input', () => {
      clearTimeout(searchTimeout);
      const q = elNewConvoSearch.value.trim();
      if (q.length < 2) {
        elNewConvoResults.innerHTML = '';
        return;
      }
      searchTimeout = setTimeout(async () => {
        try {
          const r = await fetch('/api/users/search?q=' + encodeURIComponent(q));
          const users = await r.json();
          if (!users.length) {
            elNewConvoResults.innerHTML = '<p class="muted" style="padding:12px;text-align:center;">Aucun utilisateur trouvé</p>';
            return;
          }
          elNewConvoResults.innerHTML = users.map(u => {
            if (String(u.id) === String(userId)) return '';
            const avatarSrc = u.profile_picture ? '/uploads/' + u.profile_picture : '/images/default-avatar.svg';
            return `<div class="search-result-row" style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border);cursor:pointer;" data-id="${u.id}" data-name="${escapeHtml(u.fullname)}">
              <img src="${avatarSrc}" onerror="this.src='/images/default-avatar.svg'" alt="avatar" style="width:36px;height:36px;border-radius:50%;object-fit:cover;" />
              <span style="flex:1;"><strong>${escapeHtml(u.fullname)}</strong></span>
              <button class="btn btn-primary btn-sm start-chat-btn" data-id="${u.id}" data-name="${escapeHtml(u.fullname)}" type="button">Message</button>
            </div>`;
          }).join('');

          elNewConvoResults.querySelectorAll('.start-chat-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
              e.stopPropagation();
              const targetUserId = btn.dataset.id;
              const targetName = btn.dataset.name;
              btn.disabled = true;
              btn.textContent = '...';

              try {
                // Create or find conversation via HTTP
                const r = await fetch('/chat/conversations', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ otherUserId: targetUserId })
                });
                const resp = await r.json();
                if (resp.ok) {
                  elNewConvoModal.style.display = 'none';
                  await loadConvos();
                  // Open the conversation
                  activeConversationId = resp.conversationId;
                  const convos = window.__CHAT_CONVOS_CACHE__ || [];
                  const targetConvo = convos.find(c => String(c.conversation_id) === String(resp.conversationId));
                  if (targetConvo) {
                    elChatTitle.textContent = targetName;
                    elMsgBox.innerHTML = '<p class="muted" style="text-align:center;padding-top:160px;">Chargement...</p>';
                    const msgs = await fetchMessages(activeConversationId);
                    elMsgBox.innerHTML = '';
                    msgs.forEach(appendMessage);
                    // Re-render with active state
                    renderConversations(convos);
                  }
                } else {
                  btn.textContent = 'Erreur';
                  btn.disabled = false;
                }
              } catch (e) {
                btn.textContent = 'Erreur';
                btn.disabled = false;
              }
            });
          });
        } catch (e) {
          elNewConvoResults.innerHTML = '<p class="muted">Erreur de recherche</p>';
        }
      }, 300);
    });
  }

  if (elBtnLoadConvos) {
    elBtnLoadConvos.addEventListener('click', loadConvos);
  }

  // File input handling
  if (elMsgFileInput && elFilePreview && elFilePreviewName && elBtnClearFile) {
    elMsgFileInput.addEventListener('change', () => {
      const file = elMsgFileInput.files?.[0];
      if (!file) {
        pendingFile = null;
        elFilePreview.style.display = 'none';
        return;
      }
      pendingFile = { file, previewUrl: URL.createObjectURL(file) };
      elFilePreviewName.textContent = file.name + ' (' + (file.size / 1024 / 1024).toFixed(1) + ' Mo)';
      elFilePreview.style.display = 'block';
    });

    elBtnClearFile.addEventListener('click', () => {
      elMsgFileInput.value = '';
      if (pendingFile?.previewUrl) URL.revokeObjectURL(pendingFile.previewUrl);
      pendingFile = null;
      elFilePreview.style.display = 'none';
    });
  }

  elBtnSend.addEventListener('click', async () => {
    const body = elMsgInput.value.trim();
    if (!body && !pendingFile) return;
    if (!activeConversationId) {
      toast('Choisir une conversation');
      return;
    }

    ensureSocket();

    let imageFilename = null;

    // Upload file if pending
    if (pendingFile) {
      if (isUploading) {
        toast('Téléchargement en cours...');
        return;
      }
      isUploading = true;
      elBtnSend.disabled = true;
      elBtnSend.textContent = '...';

      try {
        const formData = new FormData();
        formData.append('file', pendingFile.file);
        const uploadRes = await fetch('/chat/upload', {
          method: 'POST',
          body: formData
        });
        const uploadData = await uploadRes.json();
        if (uploadData.ok) {
          imageFilename = uploadData.filename;
        } else {
          toast(uploadData.error || 'Erreur upload');
          isUploading = false;
          elBtnSend.disabled = false;
          elBtnSend.textContent = 'Envoyer';
          return;
        }
      } catch (e) {
        toast('Erreur upload fichier');
        isUploading = false;
        elBtnSend.disabled = false;
        elBtnSend.textContent = 'Envoyer';
        return;
      }

      // Clear pending file
      if (pendingFile?.previewUrl) URL.revokeObjectURL(pendingFile.previewUrl);
      pendingFile = null;
      elMsgFileInput.value = '';
      elFilePreview.style.display = 'none';
      isUploading = false;
      elBtnSend.disabled = false;
      elBtnSend.textContent = 'Envoyer';
    }

    // Local optimistic
    appendMessage({ sender_id: userId, fullname: 'Moi', body, image: imageFilename, created_at: new Date().toISOString() });
    elMsgInput.value = '';

    const emitData = { conversationId: activeConversationId, body };
    if (imageFilename) emitData.image = imageFilename;

    socket.emit('chat:send', emitData, async (resp) => {
      if (!resp || !resp.ok) {
        toast('Envoi impossible');
      }
    });
  });

  // Send on Enter (but not Shift+Enter)
  elMsgInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      elBtnSend.click();
    }
  });

  // Typing indicator (debounced)
  let lastTypingTs = 0;
  elMsgInput.addEventListener('input', () => {
    if (!activeConversationId) return;
    const now = Date.now();
    if (now - lastTypingTs < 400) return;
    lastTypingTs = now;

    ensureSocket();
    let otherUserId = null;
    if (typeof window.__CHAT_CONVOS_CACHE__ !== 'undefined' && Array.isArray(window.__CHAT_CONVOS_CACHE__)) {
      const c = window.__CHAT_CONVOS_CACHE__.find((x) => String(x.conversation_id) === String(activeConversationId));
      otherUserId = c?.other_user_id || null;
    }

    socket.emit('chat:typing', { conversationId: activeConversationId, toUserId: otherUserId });
  });

  // Auto-load convos
  loadConvos();
})();