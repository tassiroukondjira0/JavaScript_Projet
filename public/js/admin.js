document.addEventListener('DOMContentLoaded', () => {
  const statUsers = document.getElementById('stat-users');
  const statPosts = document.getElementById('stat-posts');
  const statComments = document.getElementById('stat-comments');
  const statLikes = document.getElementById('stat-likes');
  const statMessages = document.getElementById('stat-messages');
  const usersList = document.getElementById('admin-users-list');

  async function checkAdminAndLoad() {
    // If window.currentUser is not yet loaded, wait
    if (!window.currentUser) {
      setTimeout(checkAdminAndLoad, 50);
      return;
    }

    // Redirect to home if not admin
    if (window.currentUser.is_admin !== 1 && window.currentUser.is_admin !== true) {
      window.location.href = '/';
      return;
    }

    // Load stats and list
    loadStats();
    loadUsersList();
  }

  async function loadStats() {
    try {
      const res = await fetch('/api/admin/stats');
      if (!res.ok) return;

      const stats = await res.json();
      statUsers.textContent = stats.users;
      statPosts.textContent = stats.posts;
      statComments.textContent = stats.comments;
      statLikes.textContent = stats.reactions || stats.likes;
      statMessages.textContent = stats.messages;

      const reportsRes = await fetch('/api/reports/all');
      if (reportsRes.ok) {
        const reports = await reportsRes.json();
        const pendingReports = reports.filter(r => r.status === 'pending').length;
        const statReports = document.getElementById('stat-reports');
        if (statReports) {
          statReports.textContent = `${pendingReports} / ${reports.length}`;
        }
      }
    } catch (err) {
      console.error('Error loading admin stats:', err);
    }
  }

  async function loadUsersList() {
    if (!usersList) return;

    try {
      const res = await fetch('/api/admin/users');
      if (!res.ok) return;

      const users = await res.json();

      if (users.length === 0) {
        usersList.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 24px;">Aucun utilisateur trouvé</td></tr>`;
        return;
      }

      usersList.innerHTML = users.map(u => {
        const isSelf = u.id === window.currentUser.id;
        const avatar = u.profile_picture ? `/uploads/${u.profile_picture}` : '/images/default-avatar.svg';
        const role = u.is_admin ? '<span style="color: var(--primary-color); font-weight: 600;">Administrateur</span>' : 'Membre';
        const date = new Date(u.created_at).toLocaleDateString('fr-FR');
        
        const deleteButton = isSelf ? '' : `
          <button class="btn btn-danger btn-delete-user" data-id="${u.id}" style="padding: 6px 12px; font-size: 0.8rem;">
            Bannir
          </button>
        `;

        return `
          <tr id="user-row-${u.id}">
            <td><img src="${avatar}" onerror="this.src='/images/default-avatar.svg'" class="avatar avatar-sm"></td>
            <td style="font-weight: 500;">${u.fullname}</td>
            <td>${u.email}</td>
            <td>${role}</td>
            <td>${date}</td>
            <td>${deleteButton}</td>
          </tr>
        `;
      }).join('');

      // Bind delete handlers
      usersList.querySelectorAll('.btn-delete-user').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = btn.dataset.id;
          if (confirm('Voulez-vous vraiment supprimer cet utilisateur et toutes ses données (publications, messages, commentaires, etc.) ?')) {
            try {
              const res = await fetch(`/api/admin/users/${id}`, {
                method: 'DELETE'
              });
              if (res.ok) {
                document.getElementById(`user-row-${id}`).remove();
                loadStats(); // reload counts
              } else {
                const data = await res.json();
                alert(data.error || 'Erreur lors de la suppression.');
              }
            } catch (err) {
              console.error(err);
            }
          }
        });
      });

    } catch (err) {
      console.error('Error loading users list:', err);
    }
  }

  // Start init
  checkAdminAndLoad();
});
