document.addEventListener('DOMContentLoaded', async () => {
  const { api, ui, mountShell } = window.PMT;

  const params = new URLSearchParams(window.location.search);
  const currentView = params.get('view') || 'dashboard';

  const user = await mountShell(currentView);
  if (!user) return;

  const content = document.getElementById('content');

  // Load projects and user tasks
  let projectsData = [];
  let userTasksData = [];

  async function loadData() {
    try {
      const [projRes, taskRes] = await Promise.all([
        api('/api/projects'),
        api('/api/tasks/mine')
      ]);
      projectsData = projRes.projects || [];
      userTasksData = taskRes.tasks || [];
    } catch (err) {
      ui.toast('Failed to load dashboard data: ' + err.message, 'error');
    }
  }

  await loadData();

  if (currentView === 'notifications') {
    renderNotificationsPage();
  } else if (currentView === 'tasks') {
    renderMyTasksPage();
  } else if (currentView === 'projects') {
    renderProjectsPage();
  } else {
    renderDashboardOverview();
  }

  // View: Dashboard Overview
  function renderDashboardOverview() {
    const totalProjects = projectsData.length;
    const totalMyTasks = userTasksData.length;
    const inProgressTasks = userTasksData.filter((t) => t.status === 'in-progress').length;
    const completedTasks = userTasksData.filter((t) => t.status === 'completed').length;

    content.innerHTML = `
      <div class="page-head">
        <div class="page-head-title">
          <h1>${ui.greeting(user.name)}</h1>
          <p>Here is what is happening across your projects and tasks today.</p>
        </div>
        <div class="page-head-actions">
          <button class="btn btn-primary" id="openNewProjectBtn" type="button">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            New Project
          </button>
        </div>
      </div>

      <div class="grid-stats">
        <div class="stat-card">
          <div class="stat-icon primary">📁</div>
          <div class="stat-details">
            <span>Active Projects</span>
            <strong>${totalProjects}</strong>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon progress">⚡</div>
          <div class="stat-details">
            <span>In Progress Tasks</span>
            <strong>${inProgressTasks}</strong>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon review">📋</div>
          <div class="stat-details">
            <span>My Assigned Tasks</span>
            <strong>${totalMyTasks}</strong>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon done">✓</div>
          <div class="stat-details">
            <span>Completed Tasks</span>
            <strong>${completedTasks}</strong>
          </div>
        </div>
      </div>

      <div class="two-col">
        <div>
          <div class="section-title">
            <span>Recent Projects</span>
            <a href="/dashboard.html?view=projects" class="link" style="font-size:13px;">View all &rarr;</a>
          </div>
          <div class="projects-grid" id="recentProjectsGrid">
            ${renderProjectsCards(projectsData.slice(0, 4))}
          </div>
        </div>

        <div>
          <div class="section-title">
            <span>My Assigned Tasks</span>
            <a href="/dashboard.html?view=tasks" class="link" style="font-size:13px;">View all &rarr;</a>
          </div>
          <div class="card" style="padding:14px;">
            ${renderTasksList(userTasksData.slice(0, 5))}
          </div>
        </div>
      </div>

      ${renderNewProjectModal()}
    `;

    attachCommonEvents();
  }

  // View: Projects List
  function renderProjectsPage() {
    content.innerHTML = `
      <div class="page-head">
        <div class="page-head-title">
          <h1>Projects</h1>
          <p>Collaborative group spaces for tracking boards, tasks, and team milestones.</p>
        </div>
        <div class="page-head-actions">
          <div class="search-input-wrap">
            <span class="search-icon-pos">🔍</span>
            <input type="text" id="projectSearchInput" placeholder="Search projects...">
          </div>
          <button class="btn btn-primary" id="openNewProjectBtn" type="button">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Create Project
          </button>
        </div>
      </div>

      <div class="projects-grid" id="allProjectsGrid">
        ${renderProjectsCards(projectsData)}
      </div>

      ${renderNewProjectModal()}
    `;

    const searchInput = document.getElementById('projectSearchInput');
    searchInput.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase().trim();
      const filtered = projectsData.filter((p) =>
        p.name.toLowerCase().includes(q) || (p.description && p.description.toLowerCase().includes(q))
      );
      document.getElementById('allProjectsGrid').innerHTML = renderProjectsCards(filtered);
    });

    attachCommonEvents();
  }

  // View: My Tasks List
  function renderMyTasksPage() {
    content.innerHTML = `
      <div class="page-head">
        <div class="page-head-title">
          <h1>My Assigned Tasks</h1>
          <p>All tasks currently assigned to you across your projects.</p>
        </div>
        <div class="page-head-actions">
          <div class="search-input-wrap">
            <span class="search-icon-pos">🔍</span>
            <input type="text" id="myTaskSearchInput" placeholder="Filter tasks...">
          </div>
        </div>
      </div>

      <div class="task-table-wrap">
        <table class="task-table">
          <thead>
            <tr>
              <th>Task Title</th>
              <th>Project</th>
              <th>Status</th>
              <th>Priority</th>
              <th>Due Date</th>
              <th style="text-align:right;">Actions</th>
            </tr>
          </thead>
          <tbody id="myTasksTableBody">
            ${renderMyTasksRows(userTasksData)}
          </tbody>
        </table>
      </div>
    `;

    const searchInput = document.getElementById('myTaskSearchInput');
    searchInput.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase().trim();
      const filtered = userTasksData.filter((t) =>
        t.title.toLowerCase().includes(q) || (t.project && t.project.name.toLowerCase().includes(q))
      );
      document.getElementById('myTasksTableBody').innerHTML = renderMyTasksRows(filtered);
      attachStatusChangeEvents();
    });

    attachStatusChangeEvents();
  }

  // View: Notifications Page
  async function renderNotificationsPage() {
    content.innerHTML = `
      <div class="page-head">
        <div class="page-head-title">
          <h1>Notifications</h1>
          <p>Stay updated on assignments, comments, mentions, and project activity.</p>
        </div>
        <div class="page-head-actions">
          <button class="btn btn-secondary" id="pageMarkAllReadBtn" type="button">Mark all as read</button>
        </div>
      </div>

      <div class="card" id="fullNotifCard" style="padding:0; overflow:hidden;">
        <div id="fullNotifList">${ui.emptyState('Loading', 'Fetching notifications...')}</div>
      </div>
    `;

    async function loadFullNotifs() {
      const data = await api('/api/notifications');
      const list = document.getElementById('fullNotifList');
      if (!data.notifications || !data.notifications.length) {
        list.innerHTML = ui.emptyState('No notifications', 'You have no notifications at this time.');
        return;
      }
      list.innerHTML = data.notifications
        .map(
          (n) => `
          <div class="note ${n.read ? '' : 'unread'}" data-id="${n._id}" data-project="${n.project ? n.project._id : ''}" data-task="${n.task ? n.task._id : ''}" style="padding:16px 20px;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <strong>${ui.escapeHtml(n.message)}</strong>
              <span class="muted" style="font-size:12px;">${ui.timeAgo(n.createdAt)}</span>
            </div>
            ${n.project ? `<span class="muted" style="font-size:12px; margin-top:4px;">Project: ${ui.escapeHtml(n.project.name)}</span>` : ''}
          </div>
        `
        )
        .join('');
    }

    await loadFullNotifs();

    document.getElementById('pageMarkAllReadBtn').addEventListener('click', async () => {
      try {
        await api('/api/notifications/read-all', { method: 'PUT' });
        await loadFullNotifs();
        ui.toast('All marked as read', 'success');
      } catch (err) {
        ui.toast(err.message, 'error');
      }
    });

    document.getElementById('fullNotifList').addEventListener('click', async (e) => {
      const note = e.target.closest('.note');
      if (!note) return;
      try {
        await api(`/api/notifications/${note.dataset.id}/read`, { method: 'PUT' });
      } catch (err) {}
      if (note.dataset.project) {
        const task = note.dataset.task ? `&task=${note.dataset.task}` : '';
        window.location.href = `/project.html?id=${note.dataset.project}${task}`;
      } else {
        await loadFullNotifs();
      }
    });
  }

  // Sub-renderers
  function renderProjectsCards(list) {
    if (!list || !list.length) {
      return `
        <div style="grid-column: 1 / -1;">
          ${ui.emptyState(
            'No projects yet',
            'Create your first group project to start organizing tasks, boards, and teammates.',
            '<button class="btn btn-primary" id="emptyNewProjectBtn">Create Project</button>'
          )}
        </div>
      `;
    }

    return list
      .map((p) => {
        const total = p.taskCount || 0;
        const done = p.completedCount || 0;
        const pct = total === 0 ? 0 : Math.round((done / total) * 100);
        const members = p.members || [];

        return `
        <a class="project-card" href="/project.html?id=${p._id}">
          <div class="project-card-header">
            <div>
              <h3 class="project-card-title">${ui.escapeHtml(p.name)}</h3>
              <p class="project-card-desc">${ui.escapeHtml(p.description || 'No description provided.')}</p>
            </div>
          </div>

          <div class="project-progress-wrap">
            <div class="project-progress-label">
              <span>Progress</span>
              <span>${pct}% (${done}/${total} tasks)</span>
            </div>
            <div class="progress-bar-bg">
              <div class="progress-bar-fill" style="width: ${pct}%"></div>
            </div>
          </div>

          <div class="project-card-footer">
            <div class="avatar-stack">
              ${members.slice(0, 4).map((m) => ui.avatar(m, 'sm')).join('')}
              ${members.length > 4 ? `<div class="avatar sm" style="background:#475569">+${members.length - 4}</div>` : ''}
            </div>
            <span class="btn btn-sm btn-ghost" style="color:var(--primary); font-weight:700;">Open Board &rarr;</span>
          </div>
        </a>
      `;
      })
      .join('');
  }

  function renderTasksList(tasks) {
    if (!tasks || !tasks.length) {
      return ui.emptyState('No tasks assigned', 'You are all caught up! No tasks currently assigned.');
    }
    return `
      <div class="list">
        ${tasks
          .map(
            (t) => `
            <a class="list-item" href="/project.html?id=${t.project ? t.project._id : ''}&task=${t._id}">
              <div>
                <strong style="font-size:14px; display:block; color:var(--text);">${ui.escapeHtml(t.title)}</strong>
                <span class="muted" style="font-size:12px;">📁 ${ui.escapeHtml(t.project ? t.project.name : 'Unknown')}</span>
              </div>
              <div style="display:flex; align-items:center; gap:8px;">
                ${ui.priorityBadge(t.priority)}
                ${ui.statusBadge(t.status)}
              </div>
            </a>
          `
          )
          .join('')}
      </div>
    `;
  }

  function renderMyTasksRows(tasks) {
    if (!tasks || !tasks.length) {
      return `<tr><td colspan="6" style="text-align:center; padding:32px;">No assigned tasks found.</td></tr>`;
    }
    return tasks
      .map(
        (t) => `
        <tr data-id="${t._id}">
          <td>
            <a href="/project.html?id=${t.project ? t.project._id : ''}&task=${t._id}" style="font-weight:600; color:var(--text);">
              ${ui.escapeHtml(t.title)}
            </a>
          </td>
          <td>
            <span class="badge" style="background:var(--bg-soft); color:var(--text-muted);">
              ${ui.escapeHtml(t.project ? t.project.name : 'Unknown')}
            </span>
          </td>
          <td>
            <select class="quick-status-select" data-id="${t._id}" style="padding:4px 8px; font-size:12px; border-radius:6px; border:1px solid var(--border);">
              <option value="todo" ${t.status === 'todo' ? 'selected' : ''}>To Do</option>
              <option value="in-progress" ${t.status === 'in-progress' ? 'selected' : ''}>In Progress</option>
              <option value="review" ${t.status === 'review' ? 'selected' : ''}>In Review</option>
              <option value="completed" ${t.status === 'completed' ? 'selected' : ''}>Completed</option>
            </select>
          </td>
          <td>${ui.priorityBadge(t.priority)}</td>
          <td>${ui.dueChip(t.dueDate, t.status)}</td>
          <td style="text-align:right;">
            <a class="btn btn-sm btn-secondary" href="/project.html?id=${t.project ? t.project._id : ''}&task=${t._id}">
              Open &rarr;
            </a>
          </td>
        </tr>
      `
      )
      .join('');
  }

  function attachStatusChangeEvents() {
    document.querySelectorAll('.quick-status-select').forEach((sel) => {
      sel.addEventListener('change', async (e) => {
        const taskId = e.target.dataset.id;
        const newStatus = e.target.value;
        try {
          await api(`/api/tasks/${taskId}`, {
            method: 'PUT',
            body: JSON.stringify({ status: newStatus })
          });
          ui.toast('Task status updated', 'success');
          // update local data
          const task = userTasksData.find((t) => t._id === taskId);
          if (task) task.status = newStatus;
        } catch (err) {
          ui.toast('Failed to update task: ' + err.message, 'error');
        }
      });
    });
  }

  function renderNewProjectModal() {
    return `
      <div class="modal-overlay" id="newProjectModal">
        <div class="modal">
          <div class="modal-header">
            <h2>Create New Project</h2>
            <button class="icon-btn" id="closeProjectModalBtn" type="button">✕</button>
          </div>
          <form class="form" id="createProjectForm">
            <div class="field">
              <label for="projectName">Project Name *</label>
              <input type="text" id="projectName" name="name" placeholder="e.g. Website Redesign, Mobile App Q3" required maxlength="120">
            </div>
            <div class="field">
              <label for="projectDesc">Description</label>
              <textarea id="projectDesc" name="description" placeholder="Briefly describe the project goals and workflow..." rows="3" maxlength="2000"></textarea>
            </div>
            <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:8px;">
              <button class="btn btn-secondary" id="cancelProjectModalBtn" type="button">Cancel</button>
              <button class="btn btn-primary" id="saveProjectBtn" type="submit">Create Project</button>
            </div>
          </form>
        </div>
      </div>
    `;
  }

  function attachCommonEvents() {
    const modal = document.getElementById('newProjectModal');
    const openBtn = document.getElementById('openNewProjectBtn');
    const emptyBtn = document.getElementById('emptyNewProjectBtn');
    const closeBtn = document.getElementById('closeProjectModalBtn');
    const cancelBtn = document.getElementById('cancelProjectModalBtn');
    const form = document.getElementById('createProjectForm');

    function openModal() {
      if (modal) modal.classList.add('open');
      const nameInput = document.getElementById('projectName');
      if (nameInput) setTimeout(() => nameInput.focus(), 50);
    }

    function closeModal() {
      if (modal) modal.classList.remove('open');
      if (form) form.reset();
    }

    if (openBtn) openBtn.addEventListener('click', openModal);
    if (emptyBtn) emptyBtn.addEventListener('click', openModal);
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
      });
    }

    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = form.name.value.trim();
        const description = form.description.value.trim();

        if (!name) {
          ui.toast('Project name is required', 'error');
          return;
        }

        const saveBtn = document.getElementById('saveProjectBtn');
        saveBtn.disabled = true;
        saveBtn.textContent = 'Creating...';

        try {
          const res = await api('/api/projects', {
            method: 'POST',
            body: JSON.stringify({ name, description })
          });

          ui.toast('Project created successfully!', 'success');
          closeModal();
          window.location.href = `/project.html?id=${res.project._id}`;
        } catch (err) {
          ui.toast(err.message, 'error');
          saveBtn.disabled = false;
          saveBtn.textContent = 'Create Project';
        }
      });
    }
  }
});
