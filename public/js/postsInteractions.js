// Posts interactions: stories, reactions, comments, share, save
(function() {
  'use strict';

  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ==================== STORIES ====================
  window.loadStories = async function() {
    try {
      const r = await fetch('/stories');
      const data = await r.json();
      if (!data.ok) return;
      const container = document.getElementById('storiesList');
      if (!container) return;
      container.innerHTML = '';
      (data.storyGroups || []).forEach(group => {
        const firstStory = group.stories[0];
        if (!firstStory) return;
        const avatarSrc = group.profile_picture ? '/uploads/' + group.profile_picture : '/images/default-avatar.svg';
        const div = document.createElement('div');
        div.className = 'story-item';
        div.style.cssText = 'min-width:80px;text-align:center;cursor:pointer;flex-shrink:0;';
        div.innerHTML = '<div style="width:64px;height:64px;border-radius:50%;padding:3px;background:linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888);margin:0 auto;"><img src="' + avatarSrc + '" onerror="this.src=\'/images/default-avatar.svg\'" style="width:100%;height:100%;border-radius:50%;border:2px solid var(--card);object-fit:cover;" /></div><div style="font-size:11px;margin-top:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + escapeHtml(group.fullname || '') + '</div>';
        div.addEventListener('click', () => openStoryViewer(group.stories));
        container.appendChild(div);
      });
    } catch(e) {}
  };

  window.openStoryViewer = function(stories) {
    window.currentStoryGroup = stories;
    window.currentStoryIndex = 0;
    document.getElementById('storyViewer').style.display = 'flex';
    showStory();
  };

  window.showStory = function() {
    const story = window.currentStoryGroup[window.currentStoryIndex];
    if (!story) { closeStoryViewer(); return; }
    const container = document.getElementById('storySlideshow');
    const avatarSrc = story.profile_picture ? '/uploads/' + story.profile_picture : '/images/default-avatar.svg';
    container.innerHTML = '<div style="position:relative;width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;">' +
      '<div style="position:absolute;top:0;left:0;right:0;padding:12px;display:flex;align-items:center;gap:8px;z-index:5;">' +
      '<img src="' + avatarSrc + '" style="width:32px;height:32px;border-radius:50%;object-fit:cover;" />' +
      '<span style="color:#fff;font-size:14px;font-weight:600;">' + escapeHtml(story.fullname || '') + '</span>' +
      '</div>' +
      '<img src="/uploads/' + story.media_url + '" style="max-width:100%;max-height:80%;object-fit:contain;border-radius:8px;" />' +
      (story.caption ? '<p style="color:#fff;padding:12px;text-align:center;">' + escapeHtml(story.caption) + '</p>' : '') +
      '<div style="position:absolute;bottom:16px;display:flex;gap:12px;">' +
      (window.currentStoryIndex > 0 ? '<button onclick="window.prevStory()" style="background:rgba(255,255,255,.2);border:none;color:#fff;padding:8px 16px;border-radius:8px;cursor:pointer;">Précédent</button>' : '') +
      (window.currentStoryIndex < window.currentStoryGroup.length - 1 ? '<button onclick="window.nextStory()" style="background:rgba(255,255,255,.2);border:none;color:#fff;padding:8px 16px;border-radius:8px;cursor:pointer;">Suivant</button>' : '') +
      '</div></div>';
    fetch('/stories/' + story.id + '/view', { method: 'POST' }).catch(() => {});
  };

  window.nextStory = function() { window.currentStoryIndex++; showStory(); };
  window.prevStory = function() { window.currentStoryIndex--; showStory(); };
  window.closeStoryViewer = function() { document.getElementById('storyViewer').style.display = 'none'; };

  // ==================== REACTIONS ====================
  function setupReactions() {
    document.querySelectorAll('.reaction-trigger').forEach(btn => {
      const wrapper = btn.closest('.reaction-wrapper');
      const popup = wrapper ? wrapper.querySelector('.reaction-popup') : null;
      if (!popup) return;
      let pressTimer = null;

      btn.addEventListener('mousedown', () => {
        pressTimer = setTimeout(() => { popup.style.display = 'block'; }, 500);
      });
      btn.addEventListener('mouseup', () => clearTimeout(pressTimer));
      btn.addEventListener('mouseleave', () => clearTimeout(pressTimer));
      btn.addEventListener('touchstart', (e) => {
        pressTimer = setTimeout(() => { popup.style.display = 'block'; }, 500);
      });
      btn.addEventListener('touchend', () => clearTimeout(pressTimer));

      btn.addEventListener('click', async () => {
        if (popup.style.display === 'block') return;
        const postId = btn.dataset.post;
        await toggleReaction(postId, 'like', btn);
      });

      document.addEventListener('click', (e) => {
        if (!btn.contains(e.target) && !popup.contains(e.target)) {
          popup.style.display = 'none';
        }
      });
    });

    document.querySelectorAll('.reaction-option').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const postId = btn.dataset.post;
        const type = btn.dataset.type;
        const trigger = document.querySelector('.reaction-trigger[data-post="' + postId + '"]');
        await toggleReaction(postId, type, trigger);
        const popup = btn.closest('.reaction-popup');
        if (popup) popup.style.display = 'none';
      });
    });
  }

  window.toggleReaction = async function(postId, type, trigger) {
    try {
      const r = await fetch('/api/reactions/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ post_id: postId, reaction_type: type })
      });
      if (!r.ok) return;
      const data = await r.json();
      if (trigger) {
        if (data.reacted) {
          trigger.classList.add('liked');
        } else {
          trigger.classList.remove('liked');
        }
      }
      const summary = document.querySelector('.reaction-summary[data-post="' + postId + '"]');
      if (summary && data.counts) {
        const total = data.total_count || 0;
        if (total > 0) {
          const emojis = { like: '👍', love: '❤️', haha: '😂', wow: '😮', sad: '😢', angry: '😡' };
          const topEmoji = Object.keys(data.counts).find(k => data.counts[k] > 0);
          summary.textContent = topEmoji ? (emojis[topEmoji] + ' ' + total + ' réaction' + (total > 1 ? 's' : '')) : '';
        } else {
          summary.textContent = '';
        }
      }
    } catch(e) {}
  };

  function loadReactionCounts() {
    document.querySelectorAll('.reaction-summary').forEach(el => {
      const postId = el.dataset.post;
      fetch('/api/reactions/counts?post_id=' + postId).then(r => r.json()).then(data => {
        if (data.counts) {
          const total = data.total_count || 0;
          if (total > 0) {
            const emojis = { like: '👍', love: '❤️', haha: '😂', wow: '😮', sad: '😢', angry: '😡' };
            const topEmoji = Object.keys(data.counts).find(k => data.counts[k] > 0);
            el.textContent = topEmoji ? (emojis[topEmoji] + ' ' + total + ' réaction' + (total > 1 ? 's' : '')) : '';
          }
        }
      }).catch(() => {});
    });
  }

  // ==================== COMMENTS ====================
  function setupComments() {
    document.querySelectorAll('.comment-toggle').forEach(btn => {
      btn.addEventListener('click', () => {
        const postId = btn.dataset.post;
        const section = document.querySelector('.comments-section[data-post="' + postId + '"]');
        if (section.style.display === 'none' || !section.style.display) {
          section.style.display = 'block';
          loadComments(postId);
        } else {
          section.style.display = 'none';
        }
      });
    });

    document.querySelectorAll('.comment-submit').forEach(btn => {
      btn.addEventListener('click', async () => {
        const section = btn.closest('.comments-section');
        const postId = section.dataset.post;
        const input = section.querySelector('.comment-input');
        const content = input.value.trim();
        if (!content) return;
        try {
          const r = await fetch('/api/comments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ post_id: postId, content })
          });
          if (r.ok) {
            input.value = '';
            loadComments(postId);
          }
        } catch(e) {}
      });
    });

    document.querySelectorAll('.comment-input').forEach(input => {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          input.closest('.comments-section').querySelector('.comment-submit').click();
        }
      });
    });
  }

  window.loadComments = async function(postId) {
    const list = document.querySelector('.comments-section[data-post="' + postId + '"] .comments-list');
    if (!list) return;
    const lang = document.documentElement.lang || 'fr';
    const locale = lang === 'en' ? 'en-US' : 'fr-FR';
    const currentUserId = window.currentUser ? window.currentUser.id : null;
    try {
      const r = await fetch('/api/comments/post/' + postId);
      const comments = await r.json();
      list.innerHTML = comments.map(c => {
        const avatarSrc = c.profile_picture ? '/uploads/' + c.profile_picture : '/images/default-avatar.svg';
        const isOwn = currentUserId && Number(c.user_id) === Number(currentUserId);
        var actionsHtml = '';
        if (isOwn) {
          actionsHtml = '<div style="display:flex;gap:4px;margin-top:2px;">' +
            '<button class="edit-comment-btn" data-comment-id="' + c.id + '" style="background:none;border:none;color:var(--muted);cursor:pointer;padding:2px 6px;border-radius:4px;font-size:11px;" onmouseover="this.style.background=\'var(--hover-bg)\'" onmouseout="this.style.background=\'transparent\'">✏️</button>' +
            '<button class="delete-comment-btn" data-comment-id="' + c.id + '" style="background:none;border:none;color:var(--muted);cursor:pointer;padding:2px 6px;border-radius:4px;font-size:11px;" onmouseover="this.style.background=\'var(--hover-bg)\'" onmouseout="this.style.background=\'transparent\'">🗑️</button>' +
            '</div>';
        }
        return '<div class="comment-item" style="display:flex;gap:8px;padding:8px 0;border-bottom:1px solid var(--border);">' +
          '<img src="' + avatarSrc + '" onerror="this.src=\'/images/default-avatar.svg\'" style="width:32px;height:32px;border-radius:50%;object-fit:cover;flex-shrink:0;" />' +
          '<div style="flex:1;"><div style="font-weight:600;font-size:13px;">' + escapeHtml(c.fullname || '') + '</div>' +
          '<div style="font-size:13px;">' + escapeHtml(c.content || '') + '</div>' +
          '<div style="font-size:11px;color:var(--muted);margin-top:2px;">' + (c.created_at ? new Date(c.created_at).toLocaleDateString(locale) : '') + '</div>' + actionsHtml + '</div></div>';
      }).join('');
    } catch(e) { list.innerHTML = '<p class="muted">Erreur chargement</p>'; }
  };

  // ==================== SHARE ====================
  function setupShare() {
    let sharePostId = null;
    document.querySelectorAll('.share-toggle').forEach(btn => {
      btn.addEventListener('click', () => {
        sharePostId = btn.dataset.post;
        const contentEl = document.getElementById('shareContent');
        if (contentEl) contentEl.value = '';
        const modal = document.getElementById('shareModal');
        if (modal) modal.style.display = 'flex';
      });
    });
    const cancelBtn = document.getElementById('cancelShare');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        const modal = document.getElementById('shareModal');
        if (modal) modal.style.display = 'none';
      });
    }
    const shareModal = document.getElementById('shareModal');
    if (shareModal) {
      shareModal.addEventListener('click', (e) => {
        if (e.target === shareModal) shareModal.style.display = 'none';
      });
    }
    const confirmBtn = document.getElementById('confirmShare');
    if (confirmBtn) {
      confirmBtn.addEventListener('click', async () => {
        if (!sharePostId) return;
        const contentEl = document.getElementById('shareContent');
        const content = contentEl ? contentEl.value.trim() : '';
        try {
          const r = await fetch('/api/shares', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ post_id: sharePostId, content: content || '' })
          });
          if (r.ok) {
            const modal = document.getElementById('shareModal');
            if (modal) modal.style.display = 'none';
            window.location.reload();
          } else {
            alert('Erreur lors du partage');
          }
        } catch(e) { alert('Erreur'); }
      });
    }
  }

  // ==================== SAVE ====================
  function setupSave() {
    document.querySelectorAll('.save-toggle').forEach(btn => {
      btn.addEventListener('click', async () => {
        const postId = btn.dataset.post;
        try {
          const r = await fetch('/api/posts/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ post_id: postId })
          });
          if (r.ok) {
            const data = await r.json();
            const label = btn.querySelector('span');
            if (label) label.textContent = data.saved ? 'Enregistré ✓' : 'Enregistrer';
          }
        } catch(e) {}
      });
    });
  }

  // ==================== STORY MODAL ====================
  function setupStoryModal() {
    const storyAddBtn = document.getElementById('storyAddBtn');
    const storyModal = document.getElementById('storyModal');
    const closeStoryBtn = document.getElementById('closeStoryBtn');
    const storyFileBtn = document.getElementById('storyFileBtn');
    const storyFileInput = document.getElementById('storyFileInput');
    const storyPreview = document.getElementById('storyPreview');
    const storyForm = document.getElementById('storyForm');

    if (storyAddBtn && storyModal) {
      storyAddBtn.addEventListener('click', () => { storyModal.style.display = 'flex'; });
    }
    if (closeStoryBtn && storyModal) {
      closeStoryBtn.addEventListener('click', () => { storyModal.style.display = 'none'; });
    }
    if (storyModal) {
      storyModal.addEventListener('click', (e) => {
        if (e.target === storyModal) storyModal.style.display = 'none';
      });
    }
    if (storyFileBtn && storyFileInput) {
      storyFileBtn.addEventListener('click', () => { storyFileInput.click(); });
    }
    if (storyFileInput) {
      storyFileInput.addEventListener('change', (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
          if (storyPreview) {
            storyPreview.src = ev.target.result;
            storyPreview.style.display = 'block';
          }
        };
        reader.readAsDataURL(file);
      });
    }
    if (storyForm) {
      storyForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(storyForm);
        try {
          const r = await fetch('/stories', { method: 'POST', body: formData });
          if (r.ok) {
            storyModal.style.display = 'none';
            window.loadStories();
          } else {
            alert('Erreur lors de la publication');
          }
        } catch(e) { alert('Erreur'); }
      });
    }
  }

  // ==================== COMPOSER VIDEO ====================
  function setupComposerVideo() {
    const videoInput = document.getElementById('composer-video');
    const imageInput = document.getElementById('composer-image');
    const preview = document.getElementById('composer-preview');
    const previewImg = document.getElementById('composer-preview-img');
    const previewVideo = document.getElementById('composer-preview-video');
    const removeBtn = document.getElementById('composer-remove-media');
    const filenameSpan = document.getElementById('composer-filename');

    function showPreview(file, type) {
      preview.style.display = 'block';
      const reader = new FileReader();
      reader.onload = (e) => {
        if (type === 'video') {
          previewImg.style.display = 'none';
          previewVideo.style.display = 'block';
          previewVideo.src = e.target.result;
        } else {
          previewVideo.style.display = 'none';
          previewImg.style.display = 'block';
          previewImg.src = e.target.result;
        }
      };
      reader.readAsDataURL(file);
      if (filenameSpan) filenameSpan.textContent = file.name;
    }

    function clearPreview() {
      preview.style.display = 'none';
      previewImg.src = '';
      previewImg.style.display = 'none';
      previewVideo.src = '';
      previewVideo.style.display = 'none';
      if (filenameSpan) filenameSpan.textContent = '';
      if (videoInput) videoInput.value = '';
      if (imageInput) imageInput.value = '';
    }

    if (videoInput) {
      videoInput.addEventListener('change', (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        // Clear image if selected
        if (imageInput) imageInput.value = '';
        showPreview(file, 'video');
      });
    }

    if (imageInput) {
      imageInput.addEventListener('change', (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        // Clear video if selected
        if (videoInput) videoInput.value = '';
        showPreview(file, 'image');
      });
    }

    if (removeBtn) {
      removeBtn.addEventListener('click', clearPreview);
    }
  }

  // ==================== EDIT/DELETE POSTS ====================
  function setupPostActions() {
    // Delete post handler (delegated)
    document.addEventListener('click', async (e) => {
      const deleteBtn = e.target.closest('.delete-post-btn');
      if (!deleteBtn) return;
      const postId = deleteBtn.dataset.postId;
      if (!confirm('Voulez-vous vraiment supprimer cette publication ?')) return;
      try {
        const r = await fetch('/api/posts/' + postId, { method: 'DELETE' });
        if (r.ok) {
          const article = deleteBtn.closest('.post');
          if (article) article.remove();
        } else {
          alert('Erreur lors de la suppression');
        }
      } catch(e) { alert('Erreur'); }
    });

    // Edit post handler
    document.addEventListener('click', async (e) => {
      const editBtn = e.target.closest('.edit-post-btn');
      if (!editBtn) return;
      const postId = editBtn.dataset.postId;
      const article = editBtn.closest('.post');
      const contentEl = article ? article.querySelector('.post-content') : null;
      const currentContent = contentEl ? contentEl.textContent || '' : '';

      const newContent = prompt('Modifier votre publication :', currentContent);
      if (newContent === null || newContent.trim() === '') return;

      try {
        const r = await fetch('/api/posts/' + postId, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: newContent.trim() })
        });
        if (r.ok) {
          const data = await r.json();
          if (contentEl) {
            contentEl.setAttribute('data-original-content', newContent.trim());
            contentEl.innerHTML = linkifyHashtags(escapeHtml(newContent.trim()));
          }
        } else {
          alert('Erreur lors de la modification');
        }
      } catch(e) { alert('Erreur'); }
    });
  }

  // ==================== EDIT/DELETE COMMENTS ====================
  function setupCommentActions() {
    // Delete comment (delegated)
    document.addEventListener('click', async (e) => {
      const delBtn = e.target.closest('.delete-comment-btn');
      if (!delBtn) return;
      const commentId = delBtn.dataset.commentId;
      if (!confirm('Voulez-vous vraiment supprimer ce commentaire ?')) return;
      try {
        const r = await fetch('/api/comments/' + commentId, { method: 'DELETE' });
        if (r.ok) {
          const item = delBtn.closest('.comment-item');
          if (item) item.remove();
        } else {
          alert('Erreur lors de la suppression');
        }
      } catch(e) { alert('Erreur'); }
    });

    // Edit comment (delegated)
    document.addEventListener('click', async (e) => {
      const editBtn = e.target.closest('.edit-comment-btn');
      if (!editBtn) return;
      const commentId = editBtn.dataset.commentId;
      const item = editBtn.closest('.comment-item');
      const contentDiv = item ? item.querySelector('div[style*="font-size:13px"]:not([style*="font-weight"])') : null;
      const currentContent = contentDiv ? contentDiv.textContent || '' : '';

      const newContent = prompt('Modifier votre commentaire :', currentContent);
      if (newContent === null || newContent.trim() === '') return;

      try {
        const r = await fetch('/api/comments/' + commentId, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: newContent.trim() })
        });
        if (r.ok) {
          if (contentDiv) contentDiv.textContent = newContent.trim();
        } else {
          alert('Erreur lors de la modification');
        }
      } catch(e) { alert('Erreur'); }
    });
  }

  // ==================== HASHTAG SUPPORT ====================
  function linkifyHashtags(text) {
    if (!text) return text;
    return text.replace(/#(\w+)/g, '<a href="/posts/search?q=%23$1" class="hashtag" style="color:var(--primary);font-weight:600;text-decoration:none;">#$1</a>');
  }

  function applyHashtagLinks() {
    document.querySelectorAll('.post-content').forEach(el => {
      var original = el.getAttribute('data-original-content');
      if (!original) {
        original = el.textContent || el.innerText || '';
        el.setAttribute('data-original-content', original);
      }
      el.innerHTML = linkifyHashtags(escapeHtml(original));
    });
  }

  // ==================== INFINITE SCROLL (Load More) ====================
  var currentPage = 1;

  function addLoadMoreButton() {
    var feed = document.getElementById('postsFeed');
    if (!feed) return;
    // Remove existing load more button if any
    var existing = document.getElementById('loadMoreBtn');
    if (existing) existing.remove();

    var btn = document.createElement('button');
    btn.id = 'loadMoreBtn';
    btn.className = 'btn';
    btn.style.cssText = 'display:block;width:100%;margin:16px 0;padding:12px;text-align:center;';
    btn.textContent = 'Charger plus de publications';
    btn.addEventListener('click', async function() {
      btn.disabled = true;
      btn.textContent = 'Chargement...';
      currentPage++;
      try {
        var r = await fetch('/api/posts/feed?page=' + currentPage);
        var newPosts = await r.json();
        if (!newPosts || newPosts.length === 0) {
          btn.textContent = 'Plus aucune publication.';
          return;
        }
        // Append each new post
        newPosts.forEach(function(p) {
          var article = document.createElement('article');
          article.className = 'post';
          var hasImage = !!(p.image || (p.images && p.images.length > 0));
          var hasVideo = !!p.video;
          var mediaType = hasVideo ? 'video' : (hasImage ? 'photo' : 'none');
          article.dataset.postId = p.id;
          article.dataset.userId = p.user_id;
          article.dataset.mediaType = mediaType;

          var html = '<div class="post-head">' +
            '<div class="avatar avatar-sm">' +
            (p.profile_picture ? '<img src="/uploads/' + p.profile_picture + '" onerror="this.parentNode.textContent=\'👤\'" alt="avatar" />' : '👤') +
            '</div><div><div class="post-user">' + (p.fullname || '') + '</div>' +
            '<div class="post-date">' + (p.created_at ? new Date(p.created_at).toLocaleDateString() : '') + '</div></div></div>' +
            (p.content ? '<div class="post-content">' + (p.content || '') + '</div>' : '') +
            (p.image ? '<img class="post-image" src="/uploads/' + p.image + '" alt="image" />' : '') +
            (p.video ? '<video class="post-video" src="/uploads/' + p.video + '" controls style="width:100%;max-height:480px;border-radius:var(--radius);margin-top:8px;background:#000;"></video>' : '') +
            '<div class="reaction-summary" data-post="' + p.id + '"></div>' +
            '<div class="post-actions-bar">' +
            '<div class="reaction-wrapper">' +
            '<button class="post-action-btn reaction-trigger" data-post="' + p.id + '"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg><span>J\'aime</span></button>' +
            '<div class="reaction-popup" style="display:none;">' +
            '👍❤️😂😮😢😡'.split('').map(function(e, i) {
              var types = ['like','love','haha','wow','sad','angry'];
              return '<button class="reaction-option" data-post="' + p.id + '" data-type="' + types[i] + '" style="font-size:28px;padding:4px;border:none;background:none;cursor:pointer;">' + e + '</button>';
            }).join('') +
            '</div></div>' +
            '<button class="post-action-btn comment-toggle" data-post="' + p.id + '"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg><span>Commenter</span></button>' +
            '<button class="post-action-btn share-toggle" data-post="' + p.id + '"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg><span>Partager</span></button>' +
            '<button class="post-action-btn save-toggle" data-post="' + p.id + '"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg><span>Sauvegarder</span></button>' +
            '</div>' +
            '<div class="comments-section" data-post="' + p.id + '" style="display:none;border-top:1px solid var(--border);padding-top:8px;margin-top:4px;">' +
            '<div class="comments-list" style="max-height:300px;overflow-y:auto;"></div>' +
            '<div class="comment-composer" style="display:flex;gap:8px;margin-top:8px;">' +
            '<input class="input comment-input" placeholder="Écrire un commentaire..." style="flex:1;" />' +
            '<button class="btn btn-primary btn-sm comment-submit" type="button">Envoyer</button></div></div>';

          article.innerHTML = html;
          feed.appendChild(article);
        });

        // Re-initialize event listeners on new posts
        loadReactionCounts();
        setupReactions();
        setupComments();
        setupShare();
        setupSave();
        applyHashtagLinks();

        btn.disabled = false;
        btn.textContent = 'Charger plus de publications';
      } catch(e) {
        btn.textContent = 'Erreur de chargement';
        btn.disabled = false;
      }
    });
    feed.appendChild(btn);
  }

  // ==================== FRIEND REQUEST BADGE ====================
  async function updateFriendRequestBadge() {
    var badge = document.getElementById('nav-friends-badge');
    if (!badge) return;
    try {
      var r = await fetch('/api/friends/pending');
      var requests = await r.json();
      var count = (requests && requests.length) || 0;
      badge.style.display = count > 0 ? 'inline-flex' : 'none';
      badge.textContent = String(count);
    } catch(e) {
      badge.style.display = 'none';
    }
  }

  // ==================== FEED FILTER ====================
  function setupFeedFilter() {
    const filterBtns = document.querySelectorAll('.feed-filter-btn');
    if (!filterBtns.length) return;

    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const filter = btn.dataset.filter;

        // Update active button styles
        filterBtns.forEach(b => {
          b.style.background = 'var(--bg-2)';
          b.style.color = 'var(--muted)';
          b.style.fontWeight = '500';
        });
        btn.style.background = 'var(--primary)';
        btn.style.color = '#fff';
        btn.style.fontWeight = '600';

        // Filter posts
        const posts = document.querySelectorAll('#postsFeed .post');
        posts.forEach(post => {
          const mediaType = post.dataset.mediaType || 'none';
          if (filter === 'all') {
            post.style.display = '';
          } else if (filter === 'photo') {
            post.style.display = mediaType === 'photo' ? '' : 'none';
          } else if (filter === 'video') {
            post.style.display = mediaType === 'video' ? '' : 'none';
          }
        });

        // Show empty message if no posts visible
        const visiblePosts = Array.from(posts).filter(p => p.style.display !== 'none');
        const emptyMsg = document.querySelector('.feed-empty-message');
        if (visiblePosts.length === 0) {
          if (!emptyMsg) {
            const msg = document.createElement('p');
            msg.className = 'muted feed-empty-message';
            msg.style.cssText = 'padding:20px;text-align:center;';
            msg.textContent = filter === 'photo' ? 'Aucune photo pour le moment.' : 'Aucune vidéo pour le moment.';
            document.getElementById('postsFeed').appendChild(msg);
          } else {
            emptyMsg.textContent = filter === 'photo' ? 'Aucune photo pour le moment.' : 'Aucune vidéo pour le moment.';
            emptyMsg.style.display = '';
          }
        } else {
          if (emptyMsg) emptyMsg.style.display = 'none';
        }
      });
    });
  }

  // ==================== REPORT POST ====================
  function setupReportButton() {
    document.addEventListener('click', async (e) => {
      const reportBtn = e.target.closest('.report-post-btn');
      if (!reportBtn) return;
      const postId = reportBtn.dataset.postId;
      const reason = prompt('Raison du signalement :');
      if (!reason || reason.trim().length < 4) {
        alert('Veuillez fournir une raison (min 4 caractères).');
        return;
      }
      try {
        const r = await fetch('/api/reports', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ target_type: 'POST', target_id: postId, reason: reason.trim() })
        });
        if (r.ok) {
          alert('Signalement envoyé. Merci.');
        } else {
          alert('Erreur lors du signalement');
        }
      } catch(e) { alert('Erreur'); }
    });
  }

  // ==================== IMAGE LIGHTBOX ====================
  function setupImageLightbox() {
    document.addEventListener('click', (e) => {
      const img = e.target.closest('.post-image');
      if (!img) return;
      // Don't open if clicking on a grid image (already handled by grid)
      if (img.closest('.post-image-grid')) return;
      openLightbox(img.src);
    });

    document.addEventListener('click', (e) => {
      const img = e.target.closest('.post-image-grid img');
      if (!img) return;
      openLightbox(img.src);
    });
  }

  function openLightbox(src) {
    const existing = document.getElementById('lightbox-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'lightbox-overlay';
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,.9);z-index:10000;display:flex;align-items:center;justify-content:center;cursor:pointer;';

    const img = document.createElement('img');
    img.src = src;
    img.style.cssText = 'max-width:90%;max-height:90%;object-fit:contain;border-radius:8px;box-shadow:0 0 40px rgba(0,0,0,.5);';

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕';
    closeBtn.style.cssText = 'position:absolute;top:20px;right:20px;background:rgba(255,255,255,.2);border:none;color:#fff;font-size:28px;width:44px;height:44px;border-radius:50%;cursor:pointer;z-index:10001;display:flex;align-items:center;justify-content:center;';

    overlay.appendChild(img);
    overlay.appendChild(closeBtn);

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay || e.target === closeBtn) overlay.remove();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const o = document.getElementById('lightbox-overlay');
        if (o) o.remove();
      }
    }, { once: true });

    document.body.appendChild(overlay);
  }

  // ==================== INIT ====================
  document.addEventListener('DOMContentLoaded', () => {
    loadStories();
    setupReactions();
    loadReactionCounts();
    setupComments();
    setupShare();
    setupSave();
    setupStoryModal();
    setupComposerVideo();
    setupFeedFilter();
    applyHashtagLinks();
    addLoadMoreButton();
    updateFriendRequestBadge();
    setupPostActions();
    setupCommentActions();
    setupReportButton();
    setupImageLightbox();

    // Keyboard navigation for story viewer
    document.addEventListener('keydown', (e) => {
      const viewer = document.getElementById('storyViewer');
      if (!viewer || viewer.style.display !== 'flex') return;
      if (e.key === 'ArrowRight') window.nextStory();
      if (e.key === 'ArrowLeft') window.prevStory();
      if (e.key === 'Escape') window.closeStoryViewer();
    });
  });

})();
