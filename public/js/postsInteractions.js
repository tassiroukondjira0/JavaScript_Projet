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
      // Update reaction summary with who reacted
      await updateReactionSummary(postId, data);
    } catch(e) {}
  };

  async function updateReactionSummary(postId, data) {
    const summary = document.querySelector('.reaction-summary[data-post="' + postId + '"]');
    if (!summary) return;
    
    const total = data.total_count || 0;
    if (total === 0) {
      summary.textContent = '';
      return;
    }
    
    // Fetch who reacted (names)
    try {
      const r = await fetch('/api/reactions/who?post_id=' + postId);
      if (r.ok) {
        const reactors = await r.json();
        if (reactors.length > 0) {
          // Get current user info
          const currentUserId = window.currentUser?.id;
          const otherReactors = reactors.filter(rr => String(rr.user_id) !== String(currentUserId));
          let namesStr = '';
          
          if (otherReactors.length === 0) {
            // Only current user reacted
            const currentReaction = reactors.find(rr => String(rr.user_id) === String(currentUserId));
            if (currentReaction) {
              const emojis = { like: '👍', love: '❤️', haha: '😂', wow: '😮', sad: '😢', angry: '😡' };
              namesStr = 'Vous' + (emojis[currentReaction.reaction_type] ? ' ' + emojis[currentReaction.reaction_type] : '');
            }
          } else {
            const names = otherReactors.map(rr => rr.fullname || 'Quelqu\'un');
            // Check if current user also reacted
            const currentReacted = reactors.some(rr => String(rr.user_id) === String(currentUserId));
            if (currentReacted) {
              names.unshift('Vous');
            }
            namesStr = names.join(', ');
          }
          
          // Get top emoji for display
          const emojis = { like: '👍', love: '❤️', haha: '😂', wow: '😮', sad: '😢', angry: '😡' };
          const topEmoji = Object.keys(data.counts).find(k => data.counts[k] > 0);
          const emojiStr = topEmoji ? emojis[topEmoji] : '';
          
          summary.innerHTML = '<span style="cursor:pointer;" title="' + namesStr + '">' + 
            emojiStr + ' ' + total + ' réaction' + (total > 1 ? 's' : '') + 
            ' <span style="font-size: 11px; color: var(--muted);">· ' + namesStr + '</span></span>';
        } else {
          const emojis = { like: '👍', love: '❤️', haha: '😂', wow: '😮', sad: '😢', angry: '😡' };
          const topEmoji = Object.keys(data.counts).find(k => data.counts[k] > 0);
          summary.textContent = topEmoji ? (emojis[topEmoji] + ' ' + total + ' réaction' + (total > 1 ? 's' : '')) : '';
        }
      }
    } catch(e) {
      // Fallback: show only counts
      const emojis = { like: '👍', love: '❤️', haha: '😂', wow: '😮', sad: '😢', angry: '😡' };
      const topEmoji = Object.keys(data.counts).find(k => data.counts[k] > 0);
      summary.textContent = topEmoji ? (emojis[topEmoji] + ' ' + total + ' réaction' + (total > 1 ? 's' : '')) : '';
    }
  }

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
    try {
      const r = await fetch('/api/comments/post/' + postId);
      const comments = await r.json();
      list.innerHTML = comments.map(c => {
        const avatarSrc = c.profile_picture ? '/uploads/' + c.profile_picture : '/images/default-avatar.svg';
        return '<div class="comment-item" style="display:flex;gap:8px;padding:8px 0;border-bottom:1px solid var(--border);">' +
          '<img src="' + avatarSrc + '" onerror="this.src=\'/images/default-avatar.svg\'" style="width:32px;height:32px;border-radius:50%;object-fit:cover;flex-shrink:0;" />' +
          '<div style="flex:1;"><div style="font-weight:600;font-size:13px;">' + escapeHtml(c.fullname || '') + '</div>' +
          '<div style="font-size:13px;">' + escapeHtml(c.content || '') + '</div>' +
          '<div style="font-size:11px;color:var(--muted);margin-top:2px;">' + (c.created_at ? new Date(c.created_at).toLocaleDateString(locale) : '') + '</div></div></div>';
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
