(function () {
  const { api, logout } = window.PMT;

  function shell(active) {
    return `
      <aside class="sidebar" id="sidebar">
        <a class="brand" href="/dashboard.html">
          <span class="brand-mark">N</span> Nexora
        </a>
        <div class="sidebar-live-tag" title="Connected to real-time WebSockets">
          <span class="pulse-dot"></span> Live Sync
        </div>
        <nav aria-label="Main Navigation">
          <a class="nav-link ${active === 'dashboard' ? 'active' : ''}" href="/dashboard.html">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>
            Dashboard
          </a>
          <a class="nav-link ${active === 'projects' ? 'active' : ''}" href="/dashboard.html?view=projects">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
            My Projects
          </a>
          <a class="nav-link ${active === 'tasks' ? 'active' : ''}" href="/dashboard.html?view=tasks">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
            My Tasks
          </a>
          <a class="nav-link ${active === 'notifications' ? 'active' : ''}" href="/dashboard.html?view=notifications">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
            Notifications
          </a>
          <a class="nav-link ${active === 'profile' ? 'active' : ''}" href="/profile.html">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            Profile & Settings
          </a>
        </nav>
        <div class="sidebar-foot">
          <button class="btn" id="logoutBtn" type="button">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            Logout
          </button>
        </div>
      </aside>
      <div class="overlay-nav" id="navOverlay"></div>
    `;
  }

  function topbar(user) {
    return `
      <header class="topbar">
        <div class="topbar-left">
          <button class="icon-btn menu-btn" id="menuBtn" type="button" aria-label="Open menu">☰</button>
        </div>
        <div class="topbar-right">
          <div style="position:relative">
            <button class="icon-btn" id="notifBtn" type="button" aria-label="Notifications" title="Notifications">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
              <span class="badge-count hidden" id="notifCount">0</span>
            </button>
            <div class="panel" id="notifPanel" role="dialog" aria-label="Notifications">
              <header>
                <strong>Notifications</strong>
                <button class="btn btn-sm btn-ghost" id="markAllBtn" type="button">Mark all read</button>
              </header>
              <div id="notifList">${window.PMT.ui.emptyState('Loading', 'Fetching notifications...')}</div>
            </div>
          </div>
          <a class="user-chip" href="/profile.html" title="Edit Profile">
            ${window.PMT.ui.avatar(user, 'sm')}
            <div class="user-chip-info">
              <span class="user-chip-name">${window.PMT.ui.escapeHtml(user.name)}</span>
              <span class="user-chip-user">@${window.PMT.ui.escapeHtml(user.username)}</span>
            </div>
          </a>
        </div>
      </header>
    `;
  }

  async function loadNotifications() {
    try {
      const data = await api('/api/notifications');
      const count = document.getElementById('notifCount');
      const list = document.getElementById('notifList');
      if (!count || !list) return data;

      if (data.unreadCount > 0) {
        count.textContent = data.unreadCount > 99 ? '99+' : data.unreadCount;
        count.classList.remove('hidden');
      } else {
        count.classList.add('hidden');
      }

      if (!data.notifications || !data.notifications.length) {
        list.innerHTML = window.PMT.ui.emptyState('All caught up', 'You have no new notifications.');
        return data;
      }

      list.innerHTML = data.notifications
        .map(
          (n) => `
          <div class="note ${n.read ? '' : 'unread'}" data-id="${n._id}" data-project="${n.project ? n.project._id : ''}" data-task="${n.task ? n.task._id : ''}">
            <strong>${window.PMT.ui.escapeHtml(n.message)}</strong>
            <div class="muted" style="font-size:11px;">${window.PMT.ui.timeAgo(n.createdAt)}</div>
          </div>`
        )
        .join('');
      return data;
    } catch (err) {
      console.warn('Could not load notifications', err);
      return null;
    }
  }

  window.PMT.mountShell = async function mountShell(active) {
    const user = await window.PMT.requireAuth();
    if (!user) return null;

    const root = document.getElementById('app');
    root.className = 'app-shell';
    root.innerHTML = `${shell(active)}<div class="main">${topbar(user)}<main class="content" id="content" tabindex="-1"></main></div>`;

    document.getElementById('logoutBtn').addEventListener('click', logout);
    
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('navOverlay');
    document.getElementById('menuBtn').addEventListener('click', () => {
      sidebar.classList.add('open');
      overlay.style.display = 'block';
    });
    overlay.addEventListener('click', () => {
      sidebar.classList.remove('open');
      overlay.style.display = 'none';
    });

    const panel = document.getElementById('notifPanel');
    const notifBtn = document.getElementById('notifBtn');
    notifBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      panel.classList.toggle('open');
      if (panel.classList.contains('open')) await loadNotifications();
    });

    document.addEventListener('click', (e) => {
      if (!panel.contains(e.target) && e.target !== notifBtn) {
        panel.classList.remove('open');
      }
    });

    document.getElementById('markAllBtn').addEventListener('click', async () => {
      try {
        await api('/api/notifications/read-all', { method: 'PUT' });
        await loadNotifications();
      } catch (err) {
        window.PMT.ui.toast(err.message, 'error');
      }
    });

    document.getElementById('notifList').addEventListener('click', async (e) => {
      const note = e.target.closest('.note');
      if (!note) return;
      try {
        await api(`/api/notifications/${note.dataset.id}/read`, { method: 'PUT' });
      } catch (err) {
        // continue navigation anyway
      }
      if (note.dataset.project) {
        const task = note.dataset.task ? `&task=${note.dataset.task}` : '';
        window.location.href = `/project.html?id=${note.dataset.project}${task}`;
      } else {
        await loadNotifications();
      }
    });

    const socket = window.PMT.connectSocket();
    if (socket) {
      socket.on('notification:new', (notif) => {
        loadNotifications();
        window.PMT.ui.toast(notif.message || 'New notification', 'info');
      });
    }

    await loadNotifications();
    return user;
  };

  window.PMT.loadNotifications = loadNotifications;
})();
