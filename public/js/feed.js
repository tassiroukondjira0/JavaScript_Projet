document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('form-create-post');
  const textarea = document.getElementById('post-content');
  const imageInput = document.getElementById('post-image-input');
  const previewContainer = document.getElementById('image-preview-container');
  const previewImg = document.getElementById('image-preview');
  const removeImageBtn = document.getElementById('btn-remove-image');
  const feedList = document.getElementById('feed-list');

  let selectedFile = null;

  // Listen to friendship updates to reload feed
  document.addEventListener('friendship_changed', () => {
    loadFeed();
  });

  // Image Upload Preview Logic
  if (imageInput) {
    imageInput.addEventListener('change', () => {
      const file = imageInput.files[0];
      if (file) {
        selectedFile = file;
        const reader = new FileReader();
        reader.onload = (e) => {
          previewImg.src = e.target.result;
          previewContainer.style.display = 'block';
        };
        reader.readAsDataURL(file);
      }
    });
  }

  if (removeImageBtn) {
    removeImageBtn.addEventListener('click', () => {
      selectedFile = null;
      imageInput.value = '';
      previewImg.src = '#';
      previewContainer.style.display = 'none';
    });
  }

  // Handle Create Post
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const content = textarea.value.trim();

      if (!content && !selectedFile) {
        alert('Votre publication doit contenir du texte ou une image.');
        return;
      }

      const formData = new FormData();
      formData.append('content', content);
      if (selectedFile) {
        formData.append('image', selectedFile);
      }

      try {
        const res = await fetch('/api/posts', {
          method: 'POST',
          body: formData
        });

        if (!res.ok) {
          const data = await res.json();
          alert(data.error || 'Erreur lors de la publication.');
          return;
        }

        // Clear form
        textarea.value = '';
        if (removeImageBtn) removeImageBtn.click();

        // Reload feed
        loadFeed();
      } catch (err) {
        console.error('Error creating post:', err);
      }
    });
  }

  // Load and Render Feed
  async function loadFeed() {
    if (!feedList) return;

    try {
      const res = await fetch('/api/posts/feed');
      const posts = await res.json();

      if (posts.length === 0) {
        feedList.innerHTML = `
          <div class="glass-card" style="text-align: center; padding: 40px; color: var(--text-muted);">
            <h3>Votre fil d'actualité est vide</h3>
            <p style="margin-top: 10px; font-size: 0.9rem;">Ajoutez des amis ou publiez du contenu pour commencer !</p>
          </div>
        `;
        return;
      }

      feedList.innerHTML = posts.map(p => {
        const postImg = p.image ? `<img src="/uploads/${p.image}" class="post-image" alt="Image publication">` : '';
        const hasLiked = p.has_liked === 1 || p.has_liked === true;
        const authorAvatar = p.profile_picture ? `/uploads/${p.profile_picture}` : '/images/default-avatar.svg';

        // Suppression désactivée sur le fil d'actualité.
        // Le bouton "Supprimer" sera uniquement visible sur la page profil.
        const deleteButton = '';

        const shareButton = `
          <button type="button" class="btn-share-post" data-id="${p.id}" style="background: none; border: none; color: var(--text-muted); cursor: pointer; font-size: 0.75rem; margin-left: 10px; display: inline-flex; align-items:center; gap: 6px;">
            <span style="font-size: 1rem;">🔁</span>
            <span>Partager</span>
          </button>
        `;

        const reportButton = `
          <button type="button" class="btn-report-post" data-id="${p.id}" style="background: none; border: none; color: var(--text-muted); cursor: pointer; font-size: 0.75rem; margin-left: 10px; display: inline-flex; align-items:center; gap: 6px;">
            <span style="font-size: 1rem;">🚩</span>
            <span>Signaler</span>
          </button>
        `;

        return `
          <article id="post-${p.id}" class="glass-card post-item">
            <div class="post-header">
              <img src="${authorAvatar}" onerror="this.src='/images/default-avatar.svg'" alt="Avatar" class="avatar">
              <div class="post-author-info">
                <a href="/profile/${p.user_id}" class="post-author-name">${p.fullname}</a>
                <span class="post-time">${formatTime(p.created_at)}</span>
              </div>
              <div class="post-actions-dropdown" style="display:flex; align-items:center; gap: 10px;">
                ${deleteButton}
                ${shareButton}
                ${reportButton}
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

      // Bind Post Interaction Listeners
      bindPostListeners();
    } catch (err) {
      console.error('Error loading feed:', err);
      // Show error message
      if (feedList) {
        feedList.innerHTML = `
          <div class="glass-card" style="text-align: center; padding: 40px; color: var(--text-muted);">
            <p>Impossible de charger le fil d'actualité.</p>
          </div>
        `;
      }
    }
  }

  function bindPostListeners() {
    // Share post handler
    document.querySelectorAll('.btn-share-post').forEach(btn => {
      btn.addEventListener('click', async () => {
        const postId = btn.dataset.id;
        try {
          const res = await fetch('/api/shares', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ post_id: postId })
          });

          const data = await res.json();
          if (!res.ok) {
            alert(data.error || 'Erreur lors du partage.');
            return;
          }

          // Reload feed to see shared post
          await loadFeed();
        } catch (err) {
          console.error('Error sharing post:', err);
          alert('Erreur réseau lors du partage.');
        }
      });
    });

    // Report post handler
    document.querySelectorAll('.btn-report-post').forEach(btn => {
      btn.addEventListener('click', async () => {
        const postId = btn.dataset.id;
        const reason = prompt('Pourquoi signalez-vous cette publication ? (décrivez brièvement)');
        if (!reason) return;

        try {
          const res = await fetch('/api/reports', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              entity_type: 'post',
              entity_id: postId,
              reason
            })
          });

          const data = await res.json();
          if (!res.ok) {
            alert(data.error || 'Erreur lors du signalement.');
            return;
          }

          alert('Signalement envoyé. Merci.');
        } catch (e) {
          console.error('Error reporting post:', e);
          alert('Erreur réseau lors du signalement.');
        }
      });
    });

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
            if (data.liked) {
              btn.classList.add('liked');
            } else {
              btn.classList.remove('liked');
            }
          }
        } catch (err) {
          console.error('Error toggling like:', err);
        }
      });
    });

    // Toggle comments drawer handler
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

    // Comment submission handler
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
          const data = await res.json();

          if (res.ok) {
            input.value = '';
            // Reload comments
            await loadComments(postId);
            
            // Update comments count on button
            const postCard = document.getElementById(`post-${postId}`);
            const countSpan = postCard.querySelector('.comments-count');
            countSpan.textContent = parseInt(countSpan.textContent) + 1;
          }
        } catch (err) {
          console.error('Error creating comment:', err);
        }
      });
    });


  }

  // Load and render comments for a post
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

        const reportCommentBtn = `
          <button type="button" class="btn-report-comment" data-comment-id="${c.id}" data-post-id="${postId}" style="background: none; border: none; color: var(--text-muted); cursor: pointer; font-size: 0.75rem; margin-top: 4px; display: inline-flex; align-items: center; gap: 4px; margin-left: 10px;">
            <span style="font-size: 1rem;">🚩</span>
            <span>Signaler</span>
          </button>
        `;


        const avatar = c.profile_picture ? `/uploads/${c.profile_picture}` : '/images/default-avatar.svg';

        return `
          <div id="comment-${c.id}" class="comment-item">
            <img src="${avatar}" onerror="this.src='/images/default-avatar.svg'" alt="Avatar" class="avatar avatar-sm">
            <div class="comment-bubble">
              <div class="comment-author">${c.fullname}</div>
              <div class="comment-content">${escapeHTML(c.content)}</div>
              ${deleteBtn}
              ${reportCommentBtn}
            </div>
          </div>
        `;

      }).join('');

      // Bind report comment handlers
      list.querySelectorAll('.btn-report-comment').forEach(btn => {
        btn.addEventListener('click', async () => {
          const commentId = btn.dataset.commentId;
          const reason = prompt('Pourquoi signalez-vous ce commentaire ? (décrivez brièvement)');
          if (!reason) return;

          try {
            const res = await fetch('/api/reports', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                entity_type: 'comment',
                entity_id: commentId,
                reason
              })
            });

            const data = await res.json();
            if (!res.ok) {
              alert(data.error || 'Erreur lors du signalement.');
              return;
            }

            alert('Signalement envoyé. Merci.');
          } catch (e) {
            console.error('Error reporting comment:', e);
            alert('Erreur réseau lors du signalement.');
          }
        });
      });

      // Bind delete comment handlers
      list.querySelectorAll('.btn-delete-comment').forEach(btn => {
        btn.addEventListener('click', async () => {

          const commentId = btn.dataset.commentId;
          const pid = btn.dataset.postId;
          if (confirm('Voulez-vous vraiment supprimer ce commentaire ?')) {
            try {
              const res = await fetch(`/api/comments/${commentId}`, {
                method: 'DELETE'
              });
              if (res.ok) {
                document.getElementById(`comment-${commentId}`).remove();
                
                // Update comments count on button
                const postCard = document.getElementById(`post-${pid}`);
                const countSpan = postCard.querySelector('.comments-count');
                countSpan.textContent = Math.max(0, parseInt(countSpan.textContent) - 1);
              }
            } catch (err) {
              console.error('Error deleting comment:', err);
            }
          }
        });
      });
    } catch (err) {
      console.error('Error loading comments:', err);
    }
  }

  // Utilities
  function escapeHTML(str) {
    return String(str)
      .replace(/&/g, '\x26amp;')
      .replace(/</g, '\x26lt;')
      .replace(/>/g, '\x26gt;')
      .replace(/"/g, '\x26quot;')
      .replace(/'/g, '\x26#039;');
  }

  function formatTime(isoString) {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffWeeks = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 7));
    const diffMonths = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30));
    const diffYears = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 365));

    if (diffMins < 1) return 'À l\'instant';
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    if (diffHours < 24) return `Il y a ${diffHours} h`;
    if (diffDays < 7) return `Il y a ${diffDays} j`;
    if (diffWeeks < 5) return `Il y a ${diffWeeks} sem`;
    if (diffMonths < 12) return `Il y a ${diffMonths} mois`;
    return `Il y a ${diffYears} an${diffYears > 1 ? 's' : ''}`;
  }
  
  function formatDateShort(isoString) {
    const date = new Date(isoString); 
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  }

  // Load initial feed
  setTimeout(() => {
    if (window.currentUser) {
      loadFeed();
    } else {
      // Retry in a bit once window.currentUser is loaded by main.js
      let attempts = 0;
      const maxAttempts = 30; // Max 3 seconds of retries
      const checkUser = setInterval(() => {
        attempts++;
        if (window.currentUser) {
          clearInterval(checkUser);
          loadFeed();
        } else if (attempts >= maxAttempts) {
          clearInterval(checkUser);
          // User not authenticated - show error and redirect
          console.error('Feed: User not authenticated after retries, redirecting to login');
          if (feedList) {
            feedList.innerHTML = `
              <div class="glass-card" style="text-align: center; padding: 40px; color: var(--text-muted);">
                <p>Vous devez être connecté pour voir le fil d'actualité.</p>
                <a href="/login" class="btn btn-primary" style="margin-top: 16px;">Se connecter</a>
              </div>
            `;
          }
          window.location.href = '/login';
        }
      }, 100);
    }
  }, 100);
});