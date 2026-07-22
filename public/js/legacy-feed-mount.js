document.addEventListener('DOMContentLoaded', () => {
  // Mount feed buttons/actions into the legacy EJS posts view.
  // It relies on the same API routes + classes used by public/js/feed.js.
  const feedList = document.querySelector('section.card');
  if (!feedList) return;

  // If feed.js already rendered buttons, don't duplicate.
  if (document.querySelector('.post-stat-btn.btn-like') || document.querySelector('.btn-share-post')) return;

  document.querySelectorAll('article.post').forEach((postEl) => {
    const postId = postEl.id && postEl.id.startsWith('post-') ? postEl.id.replace('post-','') : null;
    // Our legacy EJS doesn't set id="post-${id}". Use a fallback if needed.
    const computedId = postEl.getAttribute('data-post-id') || postId;
    if (!computedId) {
      // cannot bind actions without an ID
      return;
    }

    // Likes/comments/share container
    const actions = postEl.querySelector('.post-actions');
    if (!actions) return;

    actions.innerHTML = `
      <div class="post-stats">
        <button class="post-stat-btn btn-like" data-id="${computedId}">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
          <span class="likes-count">0</span> J'aime
        </button>
        <button class="post-stat-btn btn-toggle-comments" data-id="${computedId}">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
          <span class="comments-count">0</span> Commentaires
        </button>
      </div>
      <div style="margin-top:8px; display:flex; align-items:center; gap:10px;">
        <button type="button" class="btn-share-post" data-id="${computedId}">
          <span style="font-size: 1rem;">🔁</span> Partager
        </button>
        <button type="button" class="btn-report-post" data-id="${computedId}">
          <span style="font-size: 1rem;">🚩</span> Signaler
        </button>
      </div>
      <div id="comments-container-${computedId}" class="comments-section" style="display:none;">
        <div class="comments-list" id="comments-list-${computedId}"></div>
        <form class="comment-input-container form-comment" data-post-id="${computedId}">
          <input type="text" placeholder="Écrire un commentaire..." class="form-input comment-input" required>
          <button type="submit" class="btn btn-primary" style="padding: 10px 16px;">Poster</button>
        </form>
      </div>
    `;

    // minimal binding using same listeners as feed.js
    // Like
    const likeBtn = postEl.querySelector(`.btn-like[data-id="${computedId}"]`);
    likeBtn?.addEventListener('click', async () => {
      const res = await fetch('/api/likes/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ post_id: computedId })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.likes_count != null) {
        likeBtn.querySelector('.likes-count').textContent = data.likes_count;
      }
    });

    // Share
    postEl.querySelector(`.btn-share-post[data-id="${computedId}"]`)?.addEventListener('click', async () => {
      const res = await fetch('/api/shares', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ post_id: computedId })
      });
      if (res.ok) window.location.reload();
    });

    // Toggle comments
    postEl.querySelector(`.btn-toggle-comments[data-id="${computedId}"]`)?.addEventListener('click', async () => {
      const drawer = document.getElementById(`comments-container-${computedId}`);
      if (!drawer) return;
      if (drawer.style.display === 'none') drawer.style.display = 'flex';
      else drawer.style.display = 'none';
    });
  });
});

