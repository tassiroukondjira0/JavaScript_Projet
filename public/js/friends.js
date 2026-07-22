document.addEventListener('DOMContentLoaded', () => {
  const tabFriends = document.getElementById('tab-friends');
  const tabPending = document.getElementById('tab-pending');
  const tabSent = document.getElementById('tab-sent');
  const tabContent = document.getElementById('friends-tab-content');

  const countFriends = document.getElementById('friends-count');
  const countPending = document.getElementById('pending-count');
  const countSent = document.getElementById('sent-count');

  let activeTab = 'friends';

  // Listen for socket friendship changes to refresh lists
  document.addEventListener('friendship_changed', () => {
    refreshAll();
  });

  // Tab switcher logic
  if (tabFriends) {
    tabFriends.addEventListener('click', () => switchTab('friends'));
  }
  if (tabPending) {
    tabPending.addEventListener('click', () => switchTab('pending'));
  }
  if (tabSent) {
    tabSent.addEventListener('click', () => switchTab('sent'));
  }

  function switchTab(tabName) {
    activeTab = tabName;
    [tabFriends, tabPending, tabSent].forEach(t => t.classList.remove('active'));
    
    if (tabName === 'friends') {
      tabFriends.classList.add('active');
      loadFriends();
    } else if (tabName === 'pending') {
      tabPending.classList.add('active');
      loadPending();
    } else if (tabName === 'sent') {
      tabSent.classList.add('active');
      loadSent();
    }
  }

  async function refreshAll() {
    // Load counts
    try {
      const friendsRes = await fetch('/api/friends/list');
      const friends = await friendsRes.json();
      countFriends.textContent = friends.length;

      const pendingRes = await fetch('/api/friends/pending');
      const pending = await pendingRes.json();
      countPending.textContent = pending.length;

      const sentRes = await fetch('/api/friends/sent');
      const sent = await sentRes.json();
      countSent.textContent = sent.length;

      // Reload active tab content
      if (activeTab === 'friends') {
        renderFriends(friends);
      } else if (activeTab === 'pending') {
        renderPending(pending);
      } else if (activeTab === 'sent') {
        renderSent(sent);
      }
    } catch (err) {
      console.error('Error refreshing friends data:', err);
    }
  }

  // Load Friends List
  async function loadFriends() {
    tabContent.innerHTML = `<div style="text-align: center; padding: 40px;"><p style="color: var(--text-muted);">Chargement des amis...</p></div>`;
    try {
      const res = await fetch('/api/friends/list');
      const friends = await res.json();
      countFriends.textContent = friends.length;
      renderFriends(friends);
    } catch (err) {
      console.error(err);
    }
  }

  function renderFriends(friends) {
    if (friends.length === 0) {
      tabContent.innerHTML = `
        <div class="glass-card" style="text-align: center; padding: 40px; color: var(--text-muted);">
          Aucun ami pour le moment. Recherchez des membres à ajouter !
        </div>
      `;
      return;
    }

    tabContent.innerHTML = `
      <div class="friends-grid">
        ${friends.map(f => {
          const avatar = f.profile_picture ? `/uploads/${f.profile_picture}` : '/images/default-avatar.svg';
          return `
            <div class="glass-card friend-card">
              <img src="${avatar}" onerror="this.src='/images/default-avatar.svg'" alt="Avatar" class="avatar avatar-lg">
              <div class="friend-card-name">${f.fullname}</div>
              <div style="font-size: 0.75rem; color: var(--text-muted); min-height: 36px; margin-top: 4px; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">
                ${f.bio || 'Aucune description.'}
              </div>
              <div class="friend-card-actions">
                <a href="/profile/${f.id}" class="btn btn-secondary">Profil</a>
                <button class="btn btn-primary btn-chat" data-id="${f.id}">Chat</button>

                <!-- Menu options (⋮) -->
                <div class="friend-options" style="position: relative;">
                  <button class="btn btn-secondary" type="button" aria-label="Options" data-id="${f.id}" style="padding: 8px 12px; width: auto;">⋮</button>
                  <div class="friend-options-panel" hidden
                    style="position:absolute; right:0; top: calc(100% + 10px); min-width: 220px; padding: 12px; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-md); box-shadow: var(--shadow-lg); backdrop-filter: blur(16px); z-index: 1200; display:flex; flex-direction:column; gap:10px;">

                    <button class="btn btn-danger btn-remove-friend" data-id="${f.id}" style="justify-content:flex-start;">Retirer l’ami</button>
                    <button class="btn btn-secondary btn-block-friend" type="button" data-id="${f.id}" style="justify-content:flex-start; opacity:0.7;" disabled>
                      Bloquer (bientôt)
                    </button>
                    <a class="btn btn-secondary" href="/profile/${f.id}" style="justify-content:flex-start; text-decoration:none;">
                      Voir l’info du profil
                    </a>
                  </div>
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;

    // Bind friend actions
    tabContent.querySelectorAll('.btn-chat').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        // Redirect to messages page with user_id query param
        window.location.href = `/messages?user_id=${id}`;
      });
    });

    // Options menu (⋮)
    tabContent.querySelectorAll('.friend-options button[type="button"]').forEach(toggleBtn => {
      toggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const wrap = e.currentTarget.closest('.friend-options');
        if (!wrap) return;
        const panel = wrap.querySelector('.friend-options-panel');
        if (!panel) return;
        const willOpen = panel.hasAttribute('hidden');
        if (willOpen) panel.hidden = false;
        else panel.hidden = true;
      });
    });

    document.addEventListener('click', () => {
      tabContent.querySelectorAll('.friend-options-panel').forEach(p => p.hidden = true);
    });

    // Retirer l’ami depuis le menu
    tabContent.querySelectorAll('.btn-remove-friend').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        if (confirm('Voulez-vous vraiment retirer cet ami ?')) {
          const res = await fetch(`/api/friends/${id}`, { method: 'DELETE' });
          if (res.ok) refreshAll();
        }
      });
    });
  }

  // Load Pending Requests
  async function loadPending() {
    tabContent.innerHTML = `<div style="text-align: center; padding: 40px;"><p style="color: var(--text-muted);">Chargement des demandes...</p></div>`;
    try {
      const res = await fetch('/api/friends/pending');
      const pending = await res.json();
      countPending.textContent = pending.length;
      renderPending(pending);
    } catch (err) {
      console.error(err);
    }
  }

  function renderPending(requests) {
    if (requests.length === 0) {
      tabContent.innerHTML = `
        <div class="glass-card" style="text-align: center; padding: 40px; color: var(--text-muted);">
          Aucune demande d'ami reçue.
        </div>
      `;
      return;
    }

    tabContent.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 16px;">
        ${requests.map(r => {
          const avatar = r.profile_picture ? `/uploads/${r.profile_picture}` : '/images/default-avatar.svg';
          return `
            <div class="glass-card" style="display: flex; align-items: center; justify-content: space-between; padding: 16px;">
              <div style="display: flex; align-items: center; gap: 16px;">
                <img src="${avatar}" onerror="this.src='/images/default-avatar.svg'" alt="Avatar" class="avatar">
                <div>
                  <a href="/profile/${r.user_id}" style="font-weight: 600; text-decoration: none; color: var(--text-main);">${r.fullname}</a>
                  <div style="font-size: 0.75rem; color: var(--text-muted);">Reçu le ${new Date(r.created_at).toLocaleDateString('fr-FR')}</div>
                </div>
              </div>
              <div style="display: flex; gap: 8px;">
                <button class="btn btn-primary btn-accept" data-id="${r.user_id}" style="padding: 8px 16px; font-size: 0.85rem;">Accepter</button>
                <button class="btn btn-danger btn-reject" data-id="${r.user_id}" style="padding: 8px 16px; font-size: 0.85rem;">Décliner</button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;

    // Bind accept/reject buttons
    tabContent.querySelectorAll('.btn-accept').forEach(btn => {
      btn.addEventListener('click', () => respondFriendRequest(btn.dataset.id, true));
    });
    tabContent.querySelectorAll('.btn-reject').forEach(btn => {
      btn.addEventListener('click', () => respondFriendRequest(btn.dataset.id, false));
    });
  }

  async function respondFriendRequest(senderId, accept) {
    try {
      const res = await fetch('/api/friends/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sender_id: senderId, accept })
      });
      if (res.ok) refreshAll();
    } catch (err) {
      console.error(err);
    }
  }

  // Load Sent Requests
  async function loadSent() {
    tabContent.innerHTML = `<div style="text-align: center; padding: 40px;"><p style="color: var(--text-muted);">Chargement des demandes envoyées...</p></div>`;
    try {
      const res = await fetch('/api/friends/sent');
      const sent = await res.json();
      countSent.textContent = sent.length;
      renderSent(sent);
    } catch (err) {
      console.error(err);
    }
  }

  function renderSent(requests) {
    if (requests.length === 0) {
      tabContent.innerHTML = `
        <div class="glass-card" style="text-align: center; padding: 40px; color: var(--text-muted);">
          Aucune demande d'ami en attente de réponse.
        </div>
      `;
      return;
    }

    tabContent.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 16px;">
        ${requests.map(r => {
          const avatar = r.profile_picture ? `/uploads/${r.profile_picture}` : '/images/default-avatar.svg';
          return `
            <div class="glass-card" style="display: flex; align-items: center; justify-content: space-between; padding: 16px;">
              <div style="display: flex; align-items: center; gap: 16px;">
                <img src="${avatar}" onerror="this.src='/images/default-avatar.svg'" alt="Avatar" class="avatar">
                <div>
                  <a href="/profile/${r.user_id}" style="font-weight: 600; text-decoration: none; color: var(--text-main);">${r.fullname}</a>
                  <div style="font-size: 0.75rem; color: var(--text-muted);">Envoyé le ${new Date(r.created_at).toLocaleDateString('fr-FR')}</div>
                </div>
              </div>
              <button class="btn btn-secondary btn-cancel-request" data-id="${r.user_id}" style="padding: 8px 16px; font-size: 0.85rem;">
                Annuler la demande
              </button>
            </div>
          `;
        }).join('')}
      </div>
    `;

    // Bind cancel buttons
    tabContent.querySelectorAll('.btn-cancel-request').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        if (confirm('Annuler cette demande d\'ami ?')) {
          const res = await fetch(`/api/friends/${id}`, { method: 'DELETE' });
          if (res.ok) refreshAll();
        }
      });
    });
  }

  // Load friends counts and active tab on start
  setTimeout(() => {
    if (window.currentUser) {
      refreshAll();
    } else {
      const checkUser = setInterval(() => {
        if (window.currentUser) {
          clearInterval(checkUser);
          refreshAll();
        }
      }, 100);
    }
  }, 100);
});
