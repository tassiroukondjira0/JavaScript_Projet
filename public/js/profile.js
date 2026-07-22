document.addEventListener('DOMContentLoaded', () => {
  const profileId = parseInt(window.location.pathname.split('/').pop());
  
  const profileAvatar = document.getElementById('profile-avatar');
  const profileCover = document.getElementById('profile-cover');
  const profileName = document.getElementById('profile-name');
  const profileEmail = document.getElementById('profile-email');
  const profileBio = document.getElementById('profile-bio');
  const profileJoined = document.getElementById('profile-joined');
  const profileLocation = document.getElementById('profile-location');
  const profileLocationText = document.getElementById('profile-location-text');
  const profileEstablishment = document.getElementById('profile-establishment');
  const profileEstablishmentText = document.getElementById('profile-establishment-text');
  const actionContainer = document.getElementById('profile-action-container');
  
  const editCard = document.getElementById('edit-profile-card');
  const editForm = document.getElementById('form-edit-profile');
  const editFullname = document.getElementById('edit-fullname');
  const editBioInput = document.getElementById('edit-bio');
  const editLocation = document.getElementById('edit-location');
  const editEstablishment = document.getElementById('edit-establishment');
  const editAvatarFile = document.getElementById('edit-avatar-file');
  const editCoverFile = document.getElementById('edit-cover-file');
  
  const postsTitle = document.getElementById('posts-title');
  const postsList = document.getElementById('profile-posts-list');
  const friendsSection = document.getElementById('profile-friends-list');
  const friendsCount = document.getElementById('profile-friends-count');
  const photosGrid = document.getElementById('profile-photos-grid');
  const photosCount = document.getElementById('profile-photos-count');

  // Listen for socket friendship changes to refresh profile
  document.addEventListener('friendship_changed', () => {
    loadProfile();
    loadFriends();
  });

  async function loadProfile() {
    try {
      const res = await fetch(`/api/users/profile/${profileId}`);
      if (!res.ok) {
        postsList.innerHTML = `<div class="glass-card" style="text-align: center; color: var(--danger-color);">Profil introuvable.</div>`;
        return;
      }

      const data = await res.json();
      const user = data.user;
      const relation = data.relation;
      const posts = data.posts;

      const isOwnProfile = user.id === window.currentUser.id;

      // Update DOM Text content
      profileName.textContent = user.fullname;
      profileEmail.textContent = user.email;
      profileBio.textContent = user.bio || "Aucune description.";
      
      const joinedDate = new Date(user.created_at).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' });
      profileJoined.textContent = `Membre depuis le ${joinedDate}`;
      profileAvatar.src = user.profile_picture ? `/uploads/${user.profile_picture}` : '/images/default-avatar.svg';
      
      // Cover photo
      if (user.cover_photo) {
        profileCover.src = `/uploads/${user.cover_photo}`;
        profileCover.style.display = 'block';
      } else {
        profileCover.style.display = 'none';
      }

      // Location
      if (user.location && user.location.trim()) {
        profileLocationText.textContent = user.location;
        profileLocation.style.display = 'inline';
      } else {
        profileLocation.style.display = 'none';
      }

      // Establishment
      if (user.establishment && user.establishment.trim()) {
        profileEstablishmentText.textContent = user.establishment;
        profileEstablishment.style.display = 'inline';
      } else {
        profileEstablishment.style.display = 'none';
      }

      // Update posts title
      postsTitle.textContent = isOwnProfile ? 'Mes Publications' : `Publications de ${user.fullname}`;

      // Render Action buttons (Friendship / Edit profile)
      renderActionButtons(isOwnProfile, relation, user);
      
      // Render Posts
      renderPosts(posts);

    } catch (err) {
      console.error('Error loading profile:', err);
    }
  }

  function renderActionButtons(isOwnProfile, relation, user) {
    if (isOwnProfile) {
      actionContainer.innerHTML = `
        <button id="btn-toggle-edit" class="btn btn-secondary" style="padding: 10px 20px;">
          Modifier le profil
        </button>
      `;

      // Fill edit inputs
      editFullname.value = user.fullname;
      editBioInput.value = user.bio || '';
      editLocation.value = user.location || '';
      editEstablishment.value = user.establishment || '';

      document.getElementById('btn-toggle-edit').addEventListener('click', () => {
        editCard.style.display = editCard.style.display === 'none' ? 'block' : 'none';
      });

      setupProfileEditForm();
    } else {
      // Friendship actions
      if (relation === 'none') {
        actionContainer.innerHTML = `
          <button id="btn-friend-action" class="btn btn-primary" data-action="request">
            Ajouter en ami
          </button>
        `;
      } else if (relation === 'pending_sent') {
        actionContainer.innerHTML = `
          <div style="display: flex; flex-direction: column; gap: 8px;">
            <span style="font-size: 0.8rem; color: var(--text-muted); text-align: center;">Demande en attente</span>
            <button id="btn-friend-action" class="btn btn-secondary" data-action="cancel" style="padding: 8px 16px;">
              Annuler la demande
            </button>
          </div>
        `;
      } else if (relation === 'pending_received') {
        actionContainer.innerHTML = `
          <div style="display: flex; gap: 8px;">
            <button id="btn-friend-respond-accept" class="btn btn-primary" style="padding: 8px 16px;">Accepter</button>
            <button id="btn-friend-respond-reject" class="btn btn-danger" style="padding: 8px 16px;">Décliner</button>
          </div>
        `;
        
        document.getElementById('btn-friend-respond-accept').addEventListener('click', () => respondFriendRequest(user.id, true));
        document.getElementById('btn-friend-respond-reject').addEventListener('click', () => respondFriendRequest(user.id, false));
      } else if (relation === 'accepted') {
        actionContainer.innerHTML = `
          <button id="btn-friend-action" class="btn btn-danger" data-action="remove">
            Retirer des amis
          </button>
        `;
      }

      const friendBtn = document.getElementById('btn-friend-action');
      if (friendBtn) {
        friendBtn.addEventListener('click', () => handleFriendAction(friendBtn.dataset.action, user.id));
      }
    }
  }

  async function handleFriendAction(actionType, targetId) {
    try {
      if (actionType === 'request') {
        const res = await fetch('/api/friends/request', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ receiver_id: targetId })
        });
        if (res.ok) loadProfile();
      } else if (actionType === 'cancel' || actionType === 'remove') {
        const confirmMsg = actionType === 'remove' ? 'Voulez-vous vraiment retirer cet ami ?' : 'Annuler la demande d\'ami ?';
        if (confirm(confirmMsg)) {
          const res = await fetch(`/api/friends/${targetId}`, {
            method: 'DELETE'
          });
          if (res.ok) loadProfile();
        }
      }
    } catch (err) {
      console.error('Error on friend action:', err);
    }
  }

  async function respondFriendRequest(senderId, accept) {
    try {
      const res = await fetch('/api/friends/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sender_id: senderId, accept })
      });
      if (res.ok) loadProfile();
    } catch (err) {
      console.error('Error responding to friend request:', err);
    }
  }

  function setupProfileEditForm() {
    editForm.onsubmit = async (e) => {
      e.preventDefault();
      
      const formData = new FormData();
      formData.append('fullname', editFullname.value.trim());
      formData.append('bio', editBioInput.value.trim());
      formData.append('location', editLocation.value.trim());
      formData.append('establishment', editEstablishment.value.trim());
      if (editAvatarFile.files[0]) {
        formData.append('profile_picture', editAvatarFile.files[0]);
      }
      if (editCoverFile.files[0]) {
        formData.append('cover_photo', editCoverFile.files[0]);
      }

      try {
        const res = await fetch('/api/users/profile', {
          method: 'PUT',
          body: formData
        });

        if (!res.ok) {
          const data = await res.json();
          alert(data.error || 'Erreur lors de la modification.');
          return;
        }

        // Hide card and refresh profile data
        editCard.style.display = 'none';
        editAvatarFile.value = '';
        if (editCoverFile) editCoverFile.value = '';
        
        // Reload global layout to update sidebar avatar/name too
        const data = await res.json();
        window.currentUser = data.user;
        
        // Reload layout widgets
        if (typeof renderSidebar === 'function') renderSidebar();
        
        loadProfile();
      } catch (err) {
        console.error('Error updating profile:', err);
      }
    };
  }

  function renderPosts(posts) {
    if (posts.length === 0) {
      postsList.innerHTML = `
        <div class="glass-card" style="text-align: center; padding: 40px; color: var(--text-muted);">
          Aucune publication pour le moment.
        </div>
      `;
      return;
    }

    postsList.innerHTML = posts.map(p => {
      const postImg = p.image ? `<img src="/uploads/${p.image}" class="post-image" alt="Publication image">` : '';
      const hasLiked = p.has_liked === 1 || p.has_liked === true;
      const avatarSrc = p.profile_picture ? `/uploads/${p.profile_picture}` : '/images/default-avatar.svg';

      // Supprimer uniquement sur la page profil ET seulement sur ses propres publications.
      const canDelete = p.user_id === window.currentUser.id;
      const deleteButton = canDelete ? `
        <button class="btn-delete-post" data-id="${p.id}" style="background: none; border: none; color: var(--text-muted); cursor: pointer; transition: color 0.2s;" onmouseover="this.style.color='var(--danger-color)'" onmouseout="this.style.color='var(--text-muted)'">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
        </button>
      ` : '';

      return `
        <article id="post-${p.id}" class="glass-card post-item">
          <div class="post-header">
            <img src="${avatarSrc}" onerror="this.src='/images/default-avatar.svg'" alt="Avatar" class="avatar">
            <div class="post-author-info">
              <a href="/profile/${p.user_id}" class="post-author-name">${p.fullname}</a>
              <span class="post-time">${formatTime(p.created_at)}</span>
            </div>
            <div class="post-actions-dropdown">
              ${deleteButton}
            </div>
          </div>
          
          <div class="post-content">${escapeHTML(p.content)}</div>
          ${postImg}
          
          <div class="post-stats">
            <button class="post-stat-btn btn-like ${hasLiked ? 'liked' : ''}" data-id="${p.id}">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
              <span class="likes-count">${p.likes_count}</span> J'aime
            </button>
            <button class="post-stat-btn btn-toggle-comments" data-id="${p.id}">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
              <span class="comments-count">${p.comments_count}</span> Commentaires
            </button>
          </div>

          <!-- Comments Drawer -->
          <div id="comments-container-${p.id}" class="comments-section" style="display: none;">
            <div class="comments-list" id="comments-list-${p.id}"></div>
            <form class="comment-input-container form-comment" data-post-id="${p.id}">
              <input type="text" placeholder="Écrire un commentaire..." class="form-input comment-input" required>
              <button type="submit" class="btn btn-primary" style="padding: 10px 16px;">Poster</button>
            </form>
          </div>
        </article>
      `;
    }).join('');

    bindPostListeners();
  }

  // Copy of standard post/like/comment listener bind logic
  function bindPostListeners() {
    // Like button handler
    document.querySelectorAll('.btn-like').forEach(btn => {
      btn.addEventListener('click', async () => {
        const postId = btn.dataset.id;
        try {
          const res = await fetch('/api/likes/toggle', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ post_id: postId })
          });
          const data = await res.json();
          
          if (res.ok) {
            btn.querySelector('.likes-count').textContent = data.likes_count;
            if (data.liked) btn.classList.add('liked');
            else btn.classList.remove('liked');
          }
        } catch (err) {
          console.error(err);
        }
      });
    });

    // Toggle comments drawer
    document.querySelectorAll('.btn-toggle-comments').forEach(btn => {
      btn.addEventListener('click', () => {
        const postId = btn.dataset.id;
        const drawer = document.getElementById(`comments-container-${postId}`);
        if (drawer.style.display === 'none') {
          drawer.style.display = 'flex';
          loadComments(postId);
        } else {
          drawer.style.display = 'none';
        }
      });
    });

    // Comment submission
    document.querySelectorAll('.form-comment').forEach(form => {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const postId = form.dataset.postId;
        const input = form.querySelector('.comment-input');
        const content = input.value.trim();

        if (!content) return;

        try {
          const res = await fetch('/api/comments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ post_id: postId, content })
          });
          if (res.ok) {
            input.value = '';
            await loadComments(postId);
            
            const postCard = document.getElementById(`post-${postId}`);
            const countSpan = postCard.querySelector('.comments-count');
            countSpan.textContent = parseInt(countSpan.textContent) + 1;
          }
        } catch (err) {
          console.error(err);
        }
      });
    });

    // Delete post handler
    document.querySelectorAll('.btn-delete-post').forEach(btn => {
      btn.addEventListener('click', async () => {
        const postId = btn.dataset.id;
        if (confirm('Voulez-vous vraiment supprimer cette publication ?')) {
          try {
            const res = await fetch(`/api/posts/${postId}`, { method: 'DELETE' });
            if (res.ok) document.getElementById(`post-${postId}`).remove();
          } catch (err) {
            console.error(err);
          }
        }
      });
    });
  }

  async function loadComments(postId) {
    const list = document.getElementById(`comments-list-${postId}`);
    if (!list) return;

    try {
      const res = await fetch(`/api/comments/post/${postId}`);
      const comments = await res.json();

      if (comments.length === 0) {
        list.innerHTML = `<p style="color: var(--text-muted); font-size: 0.8rem; padding: 6px 0;">Aucun commentaire.</p>`;
        return;
      }

      list.innerHTML = comments.map(c => {
        const canDelete = c.user_id === window.currentUser.id || window.currentUser.is_admin === 1;
        const deleteBtn = canDelete ? `
          <button class="btn-delete-comment" data-comment-id="${c.id}" data-post-id="${postId}" style="background: none; border: none; color: var(--text-muted); cursor: pointer; font-size: 0.75rem; margin-top: 4px; display: inline-flex; align-items: center; gap: 4px;">
            <span>Supprimer</span>
          </button>
        ` : '';

        const avatar = c.profile_picture ? `/uploads/${c.profile_picture}` : '/images/default-avatar.svg';

        return `
          <div id="comment-${c.id}" class="comment-item">
            <img src="${avatar}" onerror="this.src='/images/default-avatar.svg'" alt="Avatar" class="avatar avatar-sm">
            <div class="comment-bubble">
              <div class="comment-author">${c.fullname}</div>
              <div class="comment-content">${escapeHTML(c.content)}</div>
              ${deleteBtn}
            </div>
          </div>
        `;
      }).join('');

      list.querySelectorAll('.btn-delete-comment').forEach(btn => {
        btn.addEventListener('click', async () => {
          const commentId = btn.dataset.commentId;
          const pid = btn.dataset.postId;
          if (confirm('Voulez-vous vraiment supprimer ce commentaire ?')) {
            try {
              const res = await fetch(`/api/comments/${commentId}`, { method: 'DELETE' });
              if (res.ok) {
                document.getElementById(`comment-${commentId}`).remove();
                const postCard = document.getElementById(`post-${pid}`);
                const countSpan = postCard.querySelector('.comments-count');
                countSpan.textContent = Math.max(0, parseInt(countSpan.textContent) - 1);
              }
            } catch (err) {
              console.error(err);
            }
          }
        });
      });
    } catch (err) {
      console.error(err);
    }
  }

  function escapeHTML(str) {
    return str
      .replace(/&/g, '&' + 'amp;')
      .replace(/</g, '&' + 'lt;')
      .replace(/>/g, '&' + 'gt;')
      .replace(/"/g, '&' + 'quot;')
      .replace(/'/g, '&' + '#039;');
  }

  function formatTime(isoString) {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'À l\'instant';
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    if (diffHours < 24) return `Il y a ${diffHours} h`;
    if (diffDays < 7) return `Il y a ${diffDays} j`;
    
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  }

  // ─────────────────────────────────────────────
  // FRIENDS SECTION
  // ─────────────────────────────────────────────
  async function loadFriends() {
    if (!friendsSection) return;
    try {
      const res = await fetch(`/api/friends/user/${profileId}`);
      const friends = await res.json();
      
      friendsCount.textContent = `(${friends.length})`;

      if (friends.length === 0) {
        friendsSection.innerHTML = `
          <div class="glass-card" style="text-align: center; padding: 20px; color: var(--text-muted);">
            Aucun ami pour le moment.
          </div>
        `;
        return;
      }

      friendsSection.innerHTML = `
        <div class="profile-friends-grid">
          ${friends.map(f => {
            const avatar = f.profile_picture ? `/uploads/${f.profile_picture}` : '/images/default-avatar.svg';
            return `
              <div class="glass-card profile-friend-card">
                <img src="${avatar}" onerror="this.src='/images/default-avatar.svg'" alt="Avatar" class="avatar avatar-lg" style="width: 64px; height: 64px;">
                <div class="profile-friend-card-name">${f.fullname}</div>
                <div style="font-size: 0.75rem; color: var(--text-muted); min-height: 20px; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical;">
                  ${f.bio || ''}
                </div>
                <div class="profile-friend-card-actions">
                  <!-- Options button (⋮) -->
                  <div class="profile-friend-options" style="position: relative; width: 100%;">
                    <button class="btn btn-secondary profile-friend-options-toggle" type="button" aria-label="Options" data-id="${f.id}" style="width: 100%; padding: 8px; font-size: 1.2rem; letter-spacing: 2px;">⋮</button>
                    <div class="profile-friend-options-panel" hidden
                      style="position:absolute; left:0; right:0; top: calc(100% + 6px); min-width: 180px; padding: 10px; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-md); box-shadow: var(--shadow-lg); backdrop-filter: blur(16px); z-index: 1200; display:flex; flex-direction:column; gap:8px;">

                      <a class="btn btn-secondary" href="/profile/${f.id}" style="justify-content:flex-start; text-decoration:none; padding: 8px 12px; font-size: 0.85rem;">
                        Voir le profil
                      </a>
                      <button class="btn btn-danger profile-friend-remove" data-id="${f.id}" style="justify-content:flex-start; padding: 8px 12px; font-size: 0.85rem;">Retirer l'ami</button>
                      <button class="btn btn-secondary profile-friend-block" data-id="${f.id}" style="justify-content:flex-start; padding: 8px 12px; font-size: 0.85rem; color: var(--danger-color);">Bloquer</button>
                    </div>
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `;

      // Bind options toggle
      friendsSection.querySelectorAll('.profile-friend-options-toggle').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const wrap = e.currentTarget.closest('.profile-friend-options');
          if (!wrap) return;
          const panel = wrap.querySelector('.profile-friend-options-panel');
          if (!panel) return;
          const willOpen = panel.hasAttribute('hidden');
          // Close all other panels first
          friendsSection.querySelectorAll('.profile-friend-options-panel').forEach(p => p.hidden = true);
          if (willOpen) panel.hidden = false;
          else panel.hidden = true;
        });
      });

      // Close panels when clicking outside
      document.addEventListener('click', () => {
        friendsSection.querySelectorAll('.profile-friend-options-panel').forEach(p => p.hidden = true);
      }, { once: false });

      // Bind remove friend
      friendsSection.querySelectorAll('.profile-friend-remove').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const id = btn.dataset.id;
          if (confirm('Voulez-vous vraiment retirer cet ami ?')) {
            const res = await fetch(`/api/friends/${id}`, { method: 'DELETE' });
            if (res.ok) {
              loadFriends();
              if (profileId !== window.currentUser.id) loadProfile();
            }
          }
        });
      });

      // Bind block user
      friendsSection.querySelectorAll('.profile-friend-block').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const id = btn.dataset.id;
          if (confirm('Voulez-vous vraiment bloquer cet utilisateur ?')) {
            const res = await fetch(`/api/friends/block/${id}`, { method: 'POST' });
            if (res.ok) {
              loadFriends();
              if (profileId !== window.currentUser.id) loadProfile();
            }
          }
        });
      });

    } catch (err) {
      console.error('Error loading friends:', err);
    }
  }

  // ─────────────────────────────────────────────
  // PHOTOS SECTION
  // ─────────────────────────────────────────────
  async function loadPhotos() {
    if (!photosGrid) return;
    try {
      const res = await fetch(`/api/users/profile/${profileId}`);
      if (!res.ok) return;
      const data = await res.json();
      const posts = data.posts;

      // Collect images from posts
      const images = posts.filter(p => p.image).map(p => p.image);
      
      // Include profile picture if it exists
      if (data.user.profile_picture && data.user.profile_picture !== 'default-avatar.png') {
        images.unshift(data.user.profile_picture);
      }

      photosCount.textContent = `(${images.length})`;

      if (images.length === 0) {
        photosGrid.innerHTML = `
          <div style="text-align: center; padding: 30px; color: var(--text-muted); grid-column: 1 / -1;">
            Aucune photo pour le moment.
          </div>
        `;
        return;
      }

      photosGrid.innerHTML = images.map(img => `
        <a href="/uploads/${img}" target="_blank" class="profile-photo-item" style="display: block; border-radius: 8px; overflow: hidden; aspect-ratio: 1; background: var(--surface-soft);">
          <img src="/uploads/${img}" loading="lazy" style="width: 100%; height: 100%; object-fit: cover; display: block;" onerror="this.style.display='none'">
        </a>
      `).join('');
    } catch (err) {
      console.error('Error loading photos:', err);
    }
  }

  // Load profile, friends, and photos when window.currentUser is ready
  setTimeout(() => {
    if (window.currentUser) {
      loadProfile();
      loadFriends();
      loadPhotos();
    } else {
      const checkUser = setInterval(() => {
        if (window.currentUser) {
          clearInterval(checkUser);
          loadProfile();
          loadFriends();
          loadPhotos();
        }
      }, 100);
    }
  }, 100);

  // Expose so main.js friendship_changed event can reach it
  window.__profileLoadFriends = loadFriends;
});