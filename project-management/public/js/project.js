document.addEventListener('DOMContentLoaded', async () => {
  const { api, ui, mountShell, connectSocket } = window.PMT;

  const urlParams = new URLSearchParams(window.location.search);
  const projectId = urlParams.get('id');
  const initialTaskId = urlParams.get('task');

  if (!projectId) {
    window.location.href = '/dashboard.html';
    return;
  }

  const currentUser = await mountShell('projects');
  if (!currentUser) return;

  const content = document.getElementById('content');

  // State
  let project = null;
  let stats = null;
  let tasks = [];
  let currentFilter = { text: '', assignee: '', priority: '' };
  let currentViewMode = 'kanban'; // 'kanban' | 'list'
  let activeModalTaskId = null;
  let draggedTaskId = null;

  // Real-time socket
  const socket = connectSocket();
  if (socket) {
    const emitJoin = () => socket.emit('joinProject', projectId);
    emitJoin();
    socket.on('connect', emitJoin);

    socket.on('task:created', (newTask) => {
      if (!tasks.some((t) => t._id === newTask._id)) {
        tasks.unshift(newTask);
        renderBoardContent();
        if (newTask.createdBy && newTask.createdBy._id !== currentUser._id) {
          ui.toast(`New task added: "${newTask.title}"`);
        }
      }
    });

    socket.on('task:updated', (updatedTask) => {
      const idx = tasks.findIndex((t) => t._id === updatedTask._id);
      if (idx !== -1) {
        tasks[idx] = updatedTask;
        renderBoardContent();
        if (activeModalTaskId === updatedTask._id) {
          refreshTaskModalDetails(updatedTask);
        }
      }
    });

    socket.on('task:deleted', ({ id }) => {
      tasks = tasks.filter((t) => t._id !== id);
      renderBoardContent();
      if (activeModalTaskId === id) {
        closeTaskModal();
        ui.toast('This task was deleted.', 'info');
      }
    });

    socket.on('comment:created', ({ comment, taskId }) => {
      const t = tasks.find((item) => item._id === taskId);
      if (t) {
        t.commentCount = (t.commentCount || 0) + 1;
        renderBoardContent();
      }
      if (activeModalTaskId === taskId) {
        appendCommentToDom(comment);
      }
    });

    socket.on('comment:deleted', ({ id, taskId }) => {
      const t = tasks.find((item) => item._id === taskId);
      if (t && t.commentCount > 0) {
        t.commentCount -= 1;
        renderBoardContent();
      }
      if (activeModalTaskId === taskId) {
        const commentEl = document.querySelector(`.comment-card[data-id="${id}"]`);
        if (commentEl) commentEl.remove();
      }
    });

    socket.on('project:updated', (updatedProject) => {
      project = updatedProject;
      renderProjectHeader();
      ui.toast('Project details updated', 'info');
    });

    socket.on('project:members', (updatedProject) => {
      project = updatedProject;
      renderProjectHeader();
      renderMembersModalContent();
      renderNewTaskAssigneeOptions();
      ui.toast('Project team updated', 'info');
    });
  }

  // Initial load
  async function loadProject() {
    try {
      const [projRes, tasksRes] = await Promise.all([
        api(`/api/projects/${projectId}`),
        api(`/api/projects/${projectId}/tasks`)
      ]);
      project = projRes.project;
      stats = projRes.stats;
      tasks = tasksRes.tasks || [];
      renderPage();

      if (initialTaskId) {
        openTaskModal(initialTaskId);
      }
    } catch (err) {
      content.innerHTML = ui.emptyState('Project Error', err.message, '<a href="/dashboard.html" class="btn btn-primary">Back to Dashboard</a>');
    }
  }

  await loadProject();

  function isProjectOwner() {
    return project && project.owner && (project.owner._id === currentUser._id || project.owner === currentUser._id);
  }

  function renderPage() {
    content.innerHTML = `
      <div id="projectHeaderContainer"></div>
      <div id="boardMainContainer"></div>
      ${renderTaskModalMarkup()}
      ${renderNewTaskModalMarkup()}
      ${renderMembersModalMarkup()}
      ${renderEditProjectModalMarkup()}
    `;

    renderProjectHeader();
    renderBoardContent();
    attachGlobalModalEvents();
  }

  function renderProjectHeader() {
    const container = document.getElementById('projectHeaderContainer');
    if (!container || !project) return;

    const members = project.members || [];
    const isOwner = isProjectOwner();

    container.innerHTML = `
      <div class="board-header">
        <div class="board-top-row">
          <div>
            <div style="display:flex; align-items:center; gap:10px; margin-bottom:4px;">
              <a href="/dashboard.html" class="muted" style="font-size:13px; font-weight:600;">← Back to Projects</a>
              <span class="badge" style="background:var(--bg-soft); color:var(--text-muted); font-size:11px;">
                ${isOwner ? '👑 Project Owner' : '👥 Team Member'}
              </span>
            </div>
            <h1 style="margin:0; font-size:26px; font-weight:800; letter-spacing:-0.03em;">${ui.escapeHtml(project.name)}</h1>
            <p style="margin:4px 0 0; font-size:14px; color:var(--text-muted);">${ui.escapeHtml(project.description || 'No description provided.')}</p>
          </div>

          <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
            <div class="avatar-stack" id="headerAvatarStack" style="cursor:pointer;" title="Click to view team members">
              ${members.slice(0, 5).map((m) => ui.avatar(m, 'sm')).join('')}
              ${members.length > 5 ? `<div class="avatar sm" style="background:#475569">+${members.length - 5}</div>` : ''}
            </div>
            <button class="btn btn-secondary btn-sm" id="openMembersBtn" type="button">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
              ${isOwner ? 'Manage Team' : 'Team Members'}
            </button>
            ${
              isOwner
                ? `<button class="icon-btn btn-sm" id="openProjectSettingsBtn" title="Project Settings" style="width:34px; height:34px;">⚙</button>`
                : `<button class="btn btn-secondary btn-sm" id="leaveProjectBtn" style="color:var(--danger);">Leave</button>`
            }
          </div>
        </div>

        <div class="board-top-row" style="padding-top:12px; border-top:1px solid var(--border);">
          <div class="board-controls">
            <div class="search-input-wrap">
              <span class="search-icon-pos">🔍</span>
              <input type="text" id="taskSearchInput" placeholder="Filter tasks by name or tag..." value="${ui.escapeAttr(currentFilter.text)}">
            </div>

            <select id="filterAssignee" style="height:38px; border-radius:var(--radius); border:1px solid var(--border); padding:0 10px; font-size:13px; background:var(--surface);">
              <option value="">All Assignees</option>
              <option value="unassigned" ${currentFilter.assignee === 'unassigned' ? 'selected' : ''}>Unassigned</option>
              ${members.map((m) => `<option value="${m._id}" ${currentFilter.assignee === m._id ? 'selected' : ''}>${ui.escapeHtml(m.name)}</option>`).join('')}
            </select>

            <select id="filterPriority" style="height:38px; border-radius:var(--radius); border:1px solid var(--border); padding:0 10px; font-size:13px; background:var(--surface);">
              <option value="">All Priorities</option>
              <option value="urgent" ${currentFilter.priority === 'urgent' ? 'selected' : ''}>Urgent</option>
              <option value="high" ${currentFilter.priority === 'high' ? 'selected' : ''}>High</option>
              <option value="medium" ${currentFilter.priority === 'medium' ? 'selected' : ''}>Medium</option>
              <option value="low" ${currentFilter.priority === 'low' ? 'selected' : ''}>Low</option>
            </select>
          </div>

          <div style="display:flex; align-items:center; gap:12px;">
            <div class="view-toggle">
              <button class="view-btn ${currentViewMode === 'kanban' ? 'active' : ''}" id="viewKanbanBtn" type="button">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>
                Board
              </button>
              <button class="view-btn ${currentViewMode === 'list' ? 'active' : ''}" id="viewListBtn" type="button">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
                List
              </button>
            </div>

            <button class="btn btn-primary btn-sm" id="openNewTaskBtn" type="button">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Add Task
            </button>
          </div>
        </div>
      </div>
    `;

    // Filter events
    document.getElementById('taskSearchInput').addEventListener('input', (e) => {
      currentFilter.text = e.target.value.toLowerCase().trim();
      renderBoardContent();
    });

    document.getElementById('filterAssignee').addEventListener('change', (e) => {
      currentFilter.assignee = e.target.value;
      renderBoardContent();
    });

    document.getElementById('filterPriority').addEventListener('change', (e) => {
      currentFilter.priority = e.target.value;
      renderBoardContent();
    });

    document.getElementById('viewKanbanBtn').addEventListener('click', () => {
      currentViewMode = 'kanban';
      renderProjectHeader();
      renderBoardContent();
    });

    document.getElementById('viewListBtn').addEventListener('click', () => {
      currentViewMode = 'list';
      renderProjectHeader();
      renderBoardContent();
    });

    document.getElementById('openMembersBtn').addEventListener('click', openMembersModal);
    document.getElementById('headerAvatarStack').addEventListener('click', openMembersModal);

    const settingsBtn = document.getElementById('openProjectSettingsBtn');
    if (settingsBtn) {
      settingsBtn.addEventListener('click', openEditProjectModal);
    }

    const leaveBtn = document.getElementById('leaveProjectBtn');
    if (leaveBtn) {
      leaveBtn.addEventListener('click', async () => {
        if (!confirm('Are you sure you want to leave this project?')) return;
        try {
          await api(`/api/projects/${projectId}/members/${currentUser._id}`, { method: 'DELETE' });
          ui.toast('You left the project', 'info');
          window.location.href = '/dashboard.html';
        } catch (err) {
          ui.toast(err.message, 'error');
        }
      });
    }

    document.getElementById('openNewTaskBtn').addEventListener('click', () => openNewTaskModal('todo'));
  }

  function getFilteredTasks() {
    return tasks.filter((t) => {
      if (currentFilter.text) {
        const titleMatch = t.title.toLowerCase().includes(currentFilter.text);
        const descMatch = (t.description || '').toLowerCase().includes(currentFilter.text);
        const assigneeMatch = t.assignedTo && t.assignedTo.name.toLowerCase().includes(currentFilter.text);
        if (!titleMatch && !descMatch && !assigneeMatch) return false;
      }
      if (currentFilter.assignee) {
        if (currentFilter.assignee === 'unassigned') {
          if (t.assignedTo) return false;
        } else {
          if (!t.assignedTo || t.assignedTo._id !== currentFilter.assignee) return false;
        }
      }
      if (currentFilter.priority && t.priority !== currentFilter.priority) {
        return false;
      }
      return true;
    });
  }

  function renderBoardContent() {
    const container = document.getElementById('boardMainContainer');
    if (!container) return;

    const filtered = getFilteredTasks();

    if (currentViewMode === 'list') {
      container.innerHTML = `
        <div class="task-table-wrap">
          <table class="task-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Assignee</th>
                <th>Due Date</th>
                <th>Comments</th>
                <th style="text-align:right;">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${
                filtered.length === 0
                  ? `<tr><td colspan="7" style="text-align:center; padding:32px;">No matching tasks found.</td></tr>`
                  : filtered
                      .map(
                        (t) => `
                    <tr class="list-task-row" data-id="${t._id}" style="cursor:pointer;">
                      <td style="font-weight:600; color:var(--text);">${ui.escapeHtml(t.title)}</td>
                      <td>${ui.statusBadge(t.status)}</td>
                      <td>${ui.priorityBadge(t.priority)}</td>
                      <td>
                        <div style="display:flex; align-items:center; gap:8px;">
                          ${ui.avatar(t.assignedTo, 'sm')}
                          <span style="font-size:12px;">${ui.escapeHtml(t.assignedTo ? t.assignedTo.name : 'Unassigned')}</span>
                        </div>
                      </td>
                      <td>${ui.dueChip(t.dueDate, t.status)}</td>
                      <td>
                        <span class="comment-count-chip">💬 ${t.commentCount || 0}</span>
                      </td>
                      <td style="text-align:right;">
                        <button class="btn btn-sm btn-secondary open-task-btn" data-id="${t._id}">View</button>
                      </td>
                    </tr>
                  `
                      )
                      .join('')
              }
            </tbody>
          </table>
        </div>
      `;

      container.querySelectorAll('.list-task-row').forEach((row) => {
        row.addEventListener('click', (e) => {
          if (e.target.closest('button')) return;
          openTaskModal(row.dataset.id);
        });
      });

      container.querySelectorAll('.open-task-btn').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          openTaskModal(btn.dataset.id);
        });
      });
      return;
    }

    // Kanban View
    const columns = [
      { id: 'todo', title: 'To Do', color: '#64748b' },
      { id: 'in-progress', title: 'In Progress', color: '#0284c7' },
      { id: 'review', title: 'In Review', color: '#8b5cf6' },
      { id: 'completed', title: 'Completed', color: '#10b981' }
    ];

    container.innerHTML = `
      <div class="kanban">
        ${columns
          .map((col) => {
            const colTasks = filtered.filter((t) => t.status === col.id);
            return `
            <div class="column" data-status="${col.id}">
              <div class="column-header">
                <div class="column-header-title">
                  <span class="column-dot" style="background:${col.color};"></span>
                  ${col.title}
                  <span class="column-count">${colTasks.length}</span>
                </div>
                <button class="icon-btn btn-sm add-task-col-btn" data-status="${col.id}" title="Add task to ${col.title}" style="width:26px; height:26px; font-size:12px;">+</button>
              </div>
              <div class="column-tasks-container" data-status="${col.id}">
                ${colTasks.map((t) => renderKanbanTaskCard(t)).join('')}
              </div>
            </div>
          `;
          })
          .join('')}
      </div>
    `;

    // Attach Drag and Drop handlers
    attachDragAndDropHandlers();

    // Attach Card Click handlers
    container.querySelectorAll('.task-card').forEach((card) => {
      card.addEventListener('click', () => {
        openTaskModal(card.dataset.id);
      });
    });

    // Attach quick add buttons
    container.querySelectorAll('.add-task-col-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        openNewTaskModal(btn.dataset.status);
      });
    });
  }

  function renderKanbanTaskCard(t) {
    return `
      <div class="task-card" draggable="true" data-id="${t._id}">
        <div class="task-card-top">
          ${ui.priorityBadge(t.priority)}
          ${t.dueDate ? ui.dueChip(t.dueDate, t.status) : ''}
        </div>
        <h3>${ui.escapeHtml(t.title)}</h3>
        ${t.description ? `<p>${ui.escapeHtml(t.description)}</p>` : ''}
        <div class="task-meta">
          <div class="task-meta-left">
            ${ui.avatar(t.assignedTo, 'sm')}
            <span style="font-size:12px;">${ui.escapeHtml(t.assignedTo ? t.assignedTo.name : 'Unassigned')}</span>
          </div>
          <span class="comment-count-chip" title="${t.commentCount || 0} comments">
            💬 ${t.commentCount || 0}
          </span>
        </div>
      </div>
    `;
  }

  // Drag and Drop implementation
  function attachDragAndDropHandlers() {
    const cards = document.querySelectorAll('.task-card');
    const containers = document.querySelectorAll('.column-tasks-container');

    cards.forEach((card) => {
      card.addEventListener('dragstart', (e) => {
        draggedTaskId = card.dataset.id;
        card.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', card.dataset.id);
      });

      card.addEventListener('dragend', () => {
        card.classList.remove('dragging');
        draggedTaskId = null;
        document.querySelectorAll('.column').forEach((col) => col.classList.remove('drag-over'));
      });
    });

    containers.forEach((container) => {
      const colEl = container.closest('.column');

      container.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        colEl.classList.add('drag-over');
      });

      container.addEventListener('dragleave', (e) => {
        if (!colEl.contains(e.relatedTarget)) {
          colEl.classList.remove('drag-over');
        }
      });

      container.addEventListener('drop', async (e) => {
        e.preventDefault();
        colEl.classList.remove('drag-over');
        const taskId = e.dataTransfer.getData('text/plain') || draggedTaskId;
        const targetStatus = container.dataset.status;

        if (!taskId || !targetStatus) return;

        const task = tasks.find((t) => t._id === taskId);
        if (!task || task.status === targetStatus) return;

        // Optimistic UI update
        const previousStatus = task.status;
        task.status = targetStatus;
        renderBoardContent();

        try {
          await api(`/api/tasks/${taskId}`, {
            method: 'PUT',
            body: JSON.stringify({ status: targetStatus })
          });
          ui.toast(`Task moved to ${ui.statusLabel(targetStatus)}`, 'success');
        } catch (err) {
          // Revert on error
          task.status = previousStatus;
          renderBoardContent();
          ui.toast('Failed to move task: ' + err.message, 'error');
        }
      });
    });
  }

  // Task Details Modal
  function renderTaskModalMarkup() {
    return `
      <div class="modal-overlay" id="taskDetailsModal">
        <div class="modal modal-lg">
          <div class="modal-header">
            <span class="badge" id="modalStatusBadge"></span>
            <button class="icon-btn" id="closeTaskModalBtn" type="button">✕</button>
          </div>

          <div class="two-col" style="align-items:start;">
            <!-- Left Side: Title, Description, Comments -->
            <div>
              <div class="field" style="margin-bottom:14px;">
                <label for="modalTaskTitle">Task Title</label>
                <input type="text" id="modalTaskTitle" style="font-size:16px; font-weight:700;">
              </div>

              <div class="field" style="margin-bottom:20px;">
                <label for="modalTaskDesc">Description</label>
                <textarea id="modalTaskDesc" rows="4" placeholder="Add a detailed description..."></textarea>
              </div>

              <div class="comments-container">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                  <strong style="font-size:15px; color:var(--text);">Discussion & Comments</strong>
                  <span class="muted" style="font-size:12px;">Tip: use @username to notify</span>
                </div>

                <div class="comments-list" id="modalCommentsList"></div>

                <form class="comment-input-area" id="modalCommentForm">
                  <textarea id="modalCommentInput" placeholder="Write a comment or update... (Press Shift+Enter for new line)" rows="2" required></textarea>
                  <button class="btn btn-primary" type="submit" id="modalPostCommentBtn">Post</button>
                </form>
              </div>
            </div>

            <!-- Right Side: Metadata controls -->
            <div class="card" style="padding:18px; display:flex; flex-direction:column; gap:14px; background:var(--surface-2);">
              <div class="field">
                <label for="modalTaskStatus">Status</label>
                <select id="modalTaskStatus">
                  <option value="todo">To Do</option>
                  <option value="in-progress">In Progress</option>
                  <option value="review">In Review</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              <div class="field">
                <label for="modalTaskPriority">Priority</label>
                <select id="modalTaskPriority">
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              <div class="field">
                <label for="modalTaskAssignee">Assigned Member</label>
                <select id="modalTaskAssignee"></select>
              </div>

              <div class="field">
                <label for="modalTaskDueDate">Due Date</label>
                <input type="date" id="modalTaskDueDate">
              </div>

              <div style="font-size:12px; color:var(--text-muted); padding-top:6px; border-top:1px solid var(--border);" id="modalTaskMetaFooter"></div>

              <div style="display:flex; flex-direction:column; gap:8px; margin-top:8px;">
                <button class="btn btn-primary btn-block" id="modalSaveTaskBtn" type="button">Save Changes</button>
                <button class="btn btn-danger btn-block btn-sm" id="modalDeleteTaskBtn" type="button">Delete Task</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  async function openTaskModal(taskId) {
    activeModalTaskId = taskId;
    const modal = document.getElementById('taskDetailsModal');
    if (!modal) return;
    modal.classList.add('open');

    // Update URL query without page reload
    const currentUrl = new URL(window.location);
    currentUrl.searchParams.set('task', taskId);
    window.history.replaceState({}, '', currentUrl);

    try {
      const { task } = await api(`/api/tasks/${taskId}`);
      refreshTaskModalDetails(task);
      loadCommentsForTask(taskId);
    } catch (err) {
      ui.toast('Failed to load task details: ' + err.message, 'error');
      closeTaskModal();
    }
  }

  function closeTaskModal() {
    activeModalTaskId = null;
    const modal = document.getElementById('taskDetailsModal');
    if (modal) modal.classList.remove('open');

    // Remove task param from URL
    const currentUrl = new URL(window.location);
    currentUrl.searchParams.delete('task');
    window.history.replaceState({}, '', currentUrl);
  }

  function refreshTaskModalDetails(task) {
    if (!task) return;
    document.getElementById('modalStatusBadge').innerHTML = ui.statusBadge(task.status);
    document.getElementById('modalTaskTitle').value = task.title;
    document.getElementById('modalTaskDesc').value = task.description || '';
    document.getElementById('modalTaskStatus').value = task.status;
    document.getElementById('modalTaskPriority').value = task.priority;

    // Due date
    if (task.dueDate) {
      const d = new Date(task.dueDate);
      document.getElementById('modalTaskDueDate').value = d.toISOString().split('T')[0];
    } else {
      document.getElementById('modalTaskDueDate').value = '';
    }

    // Populate members in Assignee select
    const assigneeSel = document.getElementById('modalTaskAssignee');
    const members = project ? project.members || [] : [];
    const currentAssignedId = task.assignedTo ? (task.assignedTo._id || task.assignedTo) : '';

    assigneeSel.innerHTML = `
      <option value="">Unassigned</option>
      ${members.map((m) => `<option value="${m._id}" ${m._id === currentAssignedId ? 'selected' : ''}>${ui.escapeHtml(m.name)} (@${ui.escapeHtml(m.username)})</option>`).join('')}
    `;

    const metaFooter = document.getElementById('modalTaskMetaFooter');
    metaFooter.innerHTML = `
      <div>Created by: <strong>${ui.escapeHtml(task.createdBy ? task.createdBy.name : 'Unknown')}</strong></div>
      <div>Created: ${ui.timeAgo(task.createdAt)}</div>
    `;
  }

  async function loadCommentsForTask(taskId) {
    const list = document.getElementById('modalCommentsList');
    list.innerHTML = `<div class="muted" style="text-align:center; padding:16px;">Loading comments...</div>`;

    try {
      const data = await api(`/api/tasks/${taskId}/comments`);
      const comments = data.comments || [];

      if (!comments.length) {
        list.innerHTML = `<div class="muted" style="text-align:center; padding:16px;">No comments yet. Start the conversation!</div>`;
        return;
      }

      list.innerHTML = comments.map((c) => renderCommentCard(c)).join('');
      list.scrollTop = list.scrollHeight;
    } catch (err) {
      list.innerHTML = `<div class="muted" style="text-align:center; color:var(--danger);">Failed to load comments</div>`;
    }
  }

  function renderCommentCard(c) {
    const isAuthor = c.author && (c.author._id === currentUser._id || c.author === currentUser._id);
    return `
      <div class="comment-card" data-id="${c._id}">
        ${ui.avatar(c.author, 'sm')}
        <div>
          <div>
            <span class="comment-author-name">${ui.escapeHtml(c.author ? c.author.name : 'User')}</span>
            <span class="comment-time">${ui.timeAgo(c.createdAt)}</span>
          </div>
          <div class="comment-text">${formatCommentText(c.content)}</div>
        </div>
        ${
          isAuthor
            ? `<button class="comment-delete-btn" data-id="${c._id}" title="Delete comment">🗑</button>`
            : '<div></div>'
        }
      </div>
    `;
  }

  function formatCommentText(raw) {
    const escaped = ui.escapeHtml(raw);
    // highlight @mentions
    return escaped.replace(/@([a-zA-Z0-9_]+)/g, '<span style="color:var(--primary); font-weight:700;">@$1</span>');
  }

  function appendCommentToDom(comment) {
    const list = document.getElementById('modalCommentsList');
    if (!list) return;
    const emptyNotice = list.querySelector('.muted');
    if (emptyNotice && emptyNotice.textContent.includes('No comments yet')) {
      emptyNotice.remove();
    }
    const temp = document.createElement('div');
    temp.innerHTML = renderCommentCard(comment);
    list.appendChild(temp.firstElementChild);
    list.scrollTop = list.scrollHeight;
  }

  // New Task Modal Markup
  function renderNewTaskModalMarkup() {
    return `
      <div class="modal-overlay" id="newTaskModal">
        <div class="modal">
          <div class="modal-header">
            <h2>Add New Task</h2>
            <button class="icon-btn" id="closeNewTaskModalBtn" type="button">✕</button>
          </div>
          <form class="form" id="createNewTaskForm">
            <div class="field">
              <label for="newTaskTitle">Task Title *</label>
              <input type="text" id="newTaskTitle" name="title" placeholder="e.g. Design homepage hero section" required maxlength="160">
            </div>

            <div class="field">
              <label for="newTaskDesc">Description</label>
              <textarea id="newTaskDesc" name="description" placeholder="Provide details, acceptance criteria, or links..." rows="3"></textarea>
            </div>

            <div class="row">
              <div class="field">
                <label for="newTaskStatus">Column / Status</label>
                <select id="newTaskStatus" name="status">
                  <option value="todo">To Do</option>
                  <option value="in-progress">In Progress</option>
                  <option value="review">In Review</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              <div class="field">
                <label for="newTaskPriority">Priority</label>
                <select id="newTaskPriority" name="priority">
                  <option value="low">Low</option>
                  <option value="medium" selected>Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>

            <div class="row">
              <div class="field">
                <label for="newTaskAssignee">Assignee</label>
                <select id="newTaskAssignee" name="assignedTo"></select>
              </div>

              <div class="field">
                <label for="newTaskDueDate">Due Date</label>
                <input type="date" id="newTaskDueDate" name="dueDate">
              </div>
            </div>

            <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:8px;">
              <button class="btn btn-secondary" id="cancelNewTaskBtn" type="button">Cancel</button>
              <button class="btn btn-primary" type="submit" id="submitNewTaskBtn">Create Task</button>
            </div>
          </form>
        </div>
      </div>
    `;
  }

  function renderNewTaskAssigneeOptions() {
    const sel = document.getElementById('newTaskAssignee');
    if (!sel || !project) return;
    const members = project.members || [];
    sel.innerHTML = `
      <option value="">Unassigned</option>
      ${members.map((m) => `<option value="${m._id}">${ui.escapeHtml(m.name)} (@${ui.escapeHtml(m.username)})</option>`).join('')}
    `;
  }

  function openNewTaskModal(defaultStatus = 'todo') {
    const modal = document.getElementById('newTaskModal');
    if (!modal) return;
    renderNewTaskAssigneeOptions();
    document.getElementById('newTaskStatus').value = defaultStatus;
    modal.classList.add('open');
    const input = document.getElementById('newTaskTitle');
    if (input) setTimeout(() => input.focus(), 50);
  }

  function closeNewTaskModal() {
    const modal = document.getElementById('newTaskModal');
    if (modal) modal.classList.remove('open');
    const form = document.getElementById('createNewTaskForm');
    if (form) form.reset();
  }

  // Members Management Modal Markup
  function renderMembersModalMarkup() {
    return `
      <div class="modal-overlay" id="membersModal">
        <div class="modal">
          <div class="modal-header">
            <h2>Team Members</h2>
            <button class="icon-btn" id="closeMembersModalBtn" type="button">✕</button>
          </div>

          <div id="inviteUserSection" style="margin-bottom:20px; padding-bottom:16px; border-bottom:1px solid var(--border);">
            <label style="font-size:13px; font-weight:700; display:block; margin-bottom:6px;">Add New Member</label>
            <div class="search-input-wrap">
              <span class="search-icon-pos">🔍</span>
              <input type="text" id="memberSearchInput" placeholder="Search by name, @username, or email...">
            </div>
            <div class="search-results" id="userSearchResults"></div>
          </div>

          <div style="font-size:13px; font-weight:700; margin-bottom:10px;">Current Members (<span id="memberCountBadge">0</span>)</div>
          <div style="display:flex; flex-direction:column; gap:8px; max-height:260px; overflow-y:auto;" id="currentMembersList"></div>
        </div>
      </div>
    `;
  }

  function openMembersModal() {
    const modal = document.getElementById('membersModal');
    if (!modal) return;
    modal.classList.add('open');
    renderMembersModalContent();

    // Hide search if not owner
    const inviteSection = document.getElementById('inviteUserSection');
    if (inviteSection) {
      inviteSection.style.display = isProjectOwner() ? 'block' : 'none';
    }
  }

  function closeMembersModal() {
    const modal = document.getElementById('membersModal');
    if (modal) modal.classList.remove('open');
    const searchInput = document.getElementById('memberSearchInput');
    if (searchInput) searchInput.value = '';
    const results = document.getElementById('userSearchResults');
    if (results) results.innerHTML = '';
  }

  function renderMembersModalContent() {
    if (!project) return;
    const members = project.members || [];
    const countBadge = document.getElementById('memberCountBadge');
    if (countBadge) countBadge.textContent = members.length;

    const list = document.getElementById('currentMembersList');
    if (!list) return;

    const isOwner = isProjectOwner();
    const ownerId = project.owner ? (project.owner._id || project.owner) : '';

    list.innerHTML = members
      .map((m) => {
        const isThisOwner = m._id === ownerId;
        const isSelf = m._id === currentUser._id;
        return `
        <div class="member-row">
          ${ui.avatar(m, 'sm')}
          <div class="grow">
            <strong style="font-size:13px; display:block;">${ui.escapeHtml(m.name)} ${isSelf ? '(You)' : ''}</strong>
            <span class="muted" style="font-size:12px;">@${ui.escapeHtml(m.username)}</span>
          </div>
          ${
            isThisOwner
              ? `<span class="badge" style="background:var(--warning-soft); color:var(--warning-text);">Owner</span>`
              : isOwner
              ? `<button class="btn btn-sm btn-danger remove-member-btn" data-id="${m._id}">Remove</button>`
              : ''
          }
        </div>
      `;
      })
      .join('');

    list.querySelectorAll('.remove-member-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const uid = btn.dataset.id;
        if (!confirm('Remove this member from the project?')) return;
        try {
          await api(`/api/projects/${projectId}/members/${uid}`, { method: 'DELETE' });
          ui.toast('Member removed', 'info');
        } catch (err) {
          ui.toast(err.message, 'error');
        }
      });
    });
  }

  // Edit Project Settings Modal Markup
  function renderEditProjectModalMarkup() {
    return `
      <div class="modal-overlay" id="editProjectModal">
        <div class="modal">
          <div class="modal-header">
            <h2>Project Settings</h2>
            <button class="icon-btn" id="closeEditProjectModalBtn" type="button">✕</button>
          </div>
          <form class="form" id="editProjectForm">
            <div class="field">
              <label for="editProjectName">Project Name *</label>
              <input type="text" id="editProjectName" name="name" required maxlength="120">
            </div>
            <div class="field">
              <label for="editProjectDesc">Description</label>
              <textarea id="editProjectDesc" name="description" rows="3" maxlength="2000"></textarea>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:14px; padding-top:14px; border-top:1px solid var(--border);">
              <button class="btn btn-danger btn-sm" id="deleteProjectBtn" type="button">Delete Project</button>
              <div style="display:flex; gap:10px;">
                <button class="btn btn-secondary" id="cancelEditProjectBtn" type="button">Cancel</button>
                <button class="btn btn-primary" type="submit">Save Changes</button>
              </div>
            </div>
          </form>
        </div>
      </div>
    `;
  }

  function openEditProjectModal() {
    const modal = document.getElementById('editProjectModal');
    if (!modal || !project) return;
    document.getElementById('editProjectName').value = project.name;
    document.getElementById('editProjectDesc').value = project.description || '';
    modal.classList.add('open');
  }

  function closeEditProjectModal() {
    const modal = document.getElementById('editProjectModal');
    if (modal) modal.classList.remove('open');
  }

  // Global event delegation and handlers
  function attachGlobalModalEvents() {
    // Task details modal buttons
    document.getElementById('closeTaskModalBtn').addEventListener('click', closeTaskModal);

    const taskModal = document.getElementById('taskDetailsModal');
    taskModal.addEventListener('click', (e) => {
      if (e.target === taskModal) closeTaskModal();
    });

    // Save Task Changes
    document.getElementById('modalSaveTaskBtn').addEventListener('click', async () => {
      if (!activeModalTaskId) return;

      const title = document.getElementById('modalTaskTitle').value.trim();
      const description = document.getElementById('modalTaskDesc').value.trim();
      const status = document.getElementById('modalTaskStatus').value;
      const priority = document.getElementById('modalTaskPriority').value;
      const assignedTo = document.getElementById('modalTaskAssignee').value || null;
      const dueDate = document.getElementById('modalTaskDueDate').value || null;

      if (!title) {
        ui.toast('Task title is required', 'error');
        return;
      }

      try {
        const res = await api(`/api/tasks/${activeModalTaskId}`, {
          method: 'PUT',
          body: JSON.stringify({ title, description, status, priority, assignedTo, dueDate })
        });
        ui.toast('Task updated successfully', 'success');

        const idx = tasks.findIndex((t) => t._id === activeModalTaskId);
        if (idx !== -1) {
          tasks[idx] = res.task;
          renderBoardContent();
        }
      } catch (err) {
        ui.toast(err.message, 'error');
      }
    });

    // Delete Task
    document.getElementById('modalDeleteTaskBtn').addEventListener('click', async () => {
      if (!activeModalTaskId) return;
      if (!confirm('Are you sure you want to delete this task? All comments will be deleted.')) return;

      try {
        await api(`/api/tasks/${activeModalTaskId}`, { method: 'DELETE' });
        ui.toast('Task deleted', 'info');
        tasks = tasks.filter((t) => t._id !== activeModalTaskId);
        closeTaskModal();
        renderBoardContent();
      } catch (err) {
        ui.toast(err.message, 'error');
      }
    });

    // Post Comment
    const commentForm = document.getElementById('modalCommentForm');
    commentForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!activeModalTaskId) return;

      const input = document.getElementById('modalCommentInput');
      const content = input.value.trim();
      if (!content) return;

      const btn = document.getElementById('modalPostCommentBtn');
      btn.disabled = true;

      try {
        const res = await api(`/api/tasks/${activeModalTaskId}/comments`, {
          method: 'POST',
          body: JSON.stringify({ content })
        });
        input.value = '';
        appendCommentToDom(res.comment);

        const t = tasks.find((item) => item._id === activeModalTaskId);
        if (t) {
          t.commentCount = (t.commentCount || 0) + 1;
          renderBoardContent();
        }
      } catch (err) {
        ui.toast(err.message, 'error');
      } finally {
        btn.disabled = false;
      }
    });

    // Delete comment delegation
    document.getElementById('modalCommentsList').addEventListener('click', async (e) => {
      const delBtn = e.target.closest('.comment-delete-btn');
      if (!delBtn) return;
      const cid = delBtn.dataset.id;
      if (!confirm('Delete this comment?')) return;

      try {
        await api(`/api/comments/${cid}`, { method: 'DELETE' });
        delBtn.closest('.comment-card').remove();
        ui.toast('Comment deleted', 'info');

        const t = tasks.find((item) => item._id === activeModalTaskId);
        if (t && t.commentCount > 0) {
          t.commentCount -= 1;
          renderBoardContent();
        }
      } catch (err) {
        ui.toast(err.message, 'error');
      }
    });

    // New task modal events
    document.getElementById('closeNewTaskModalBtn').addEventListener('click', closeNewTaskModal);
    document.getElementById('cancelNewTaskBtn').addEventListener('click', closeNewTaskModal);

    const newTaskModal = document.getElementById('newTaskModal');
    newTaskModal.addEventListener('click', (e) => {
      if (e.target === newTaskModal) closeNewTaskModal();
    });

    const newTaskForm = document.getElementById('createNewTaskForm');
    newTaskForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const title = newTaskForm.title.value.trim();
      const description = newTaskForm.description.value.trim();
      const status = newTaskForm.status.value;
      const priority = newTaskForm.priority.value;
      const assignedTo = newTaskForm.assignedTo.value || null;
      const dueDate = newTaskForm.dueDate.value || null;

      if (!title) {
        ui.toast('Task title is required', 'error');
        return;
      }

      const submitBtn = document.getElementById('submitNewTaskBtn');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Adding...';

      try {
        const res = await api(`/api/projects/${projectId}/tasks`, {
          method: 'POST',
          body: JSON.stringify({ title, description, status, priority, assignedTo, dueDate })
        });

        tasks.unshift(res.task);
        renderBoardContent();
        closeNewTaskModal();
        ui.toast('Task added to board!', 'success');
      } catch (err) {
        ui.toast(err.message, 'error');
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Create Task';
      }
    });

    // Members modal events
    document.getElementById('closeMembersModalBtn').addEventListener('click', closeMembersModal);
    const membersModal = document.getElementById('membersModal');
    membersModal.addEventListener('click', (e) => {
      if (e.target === membersModal) closeMembersModal();
    });

    // Search users for invite
    let searchDebounce = null;
    const searchInput = document.getElementById('memberSearchInput');
    const searchResults = document.getElementById('userSearchResults');

    searchInput.addEventListener('input', (e) => {
      clearTimeout(searchDebounce);
      const q = e.target.value.trim();
      if (!q) {
        searchResults.innerHTML = '';
        return;
      }

      searchDebounce = setTimeout(async () => {
        try {
          const res = await api(`/api/users/search?q=${encodeURIComponent(q)}`);
          const found = res.users || [];
          const existingIds = (project.members || []).map((m) => m._id);

          if (!found.length) {
            searchResults.innerHTML = `<div class="muted" style="font-size:12px; padding:6px;">No users found matching "${ui.escapeHtml(q)}"</div>`;
            return;
          }

          searchResults.innerHTML = found
            .map((u) => {
              const alreadyMember = existingIds.includes(u._id);
              return `
              <div class="member-row" style="padding:8px 10px;">
                ${ui.avatar(u, 'sm')}
                <div class="grow">
                  <strong style="font-size:13px; display:block;">${ui.escapeHtml(u.name)}</strong>
                  <span class="muted" style="font-size:11px;">@${ui.escapeHtml(u.username)} • ${ui.escapeHtml(u.email)}</span>
                </div>
                ${
                  alreadyMember
                    ? `<span class="badge" style="background:var(--bg-soft); color:var(--text-muted);">Joined</span>`
                    : `<button class="btn btn-sm btn-primary add-user-btn" data-id="${u._id}">+ Add</button>`
                }
              </div>
            `;
            })
            .join('');

          searchResults.querySelectorAll('.add-user-btn').forEach((btn) => {
            btn.addEventListener('click', async () => {
              const uid = btn.dataset.id;
              btn.disabled = true;
              btn.textContent = 'Adding...';
              try {
                await api(`/api/projects/${projectId}/members`, {
                  method: 'POST',
                  body: JSON.stringify({ userId: uid })
                });
                ui.toast('Member added to project!', 'success');
                searchInput.value = '';
                searchResults.innerHTML = '';
              } catch (err) {
                ui.toast(err.message, 'error');
                btn.disabled = false;
                btn.textContent = '+ Add';
              }
            });
          });
        } catch (err) {
          searchResults.innerHTML = `<div class="muted" style="font-size:12px; color:var(--danger);">Search error</div>`;
        }
      }, 250);
    });

    // Project edit modal events
    document.getElementById('closeEditProjectModalBtn').addEventListener('click', closeEditProjectModal);
    document.getElementById('cancelEditProjectBtn').addEventListener('click', closeEditProjectModal);
    const editModal = document.getElementById('editProjectModal');
    editModal.addEventListener('click', (e) => {
      if (e.target === editModal) closeEditProjectModal();
    });

    const editForm = document.getElementById('editProjectForm');
    editForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = editForm.name.value.trim();
      const description = editForm.description.value.trim();

      if (!name) {
        ui.toast('Project name is required', 'error');
        return;
      }

      try {
        const res = await api(`/api/projects/${projectId}`, {
          method: 'PUT',
          body: JSON.stringify({ name, description })
        });
        project = res.project;
        renderProjectHeader();
        closeEditProjectModal();
        ui.toast('Project updated!', 'success');
      } catch (err) {
        ui.toast(err.message, 'error');
      }
    });

    document.getElementById('deleteProjectBtn').addEventListener('click', async () => {
      if (!confirm('Are you ABSOLUTELY sure? This will delete this project and all its tasks permanently!')) return;
      try {
        await api(`/api/projects/${projectId}`, { method: 'DELETE' });
        ui.toast('Project deleted', 'info');
        window.location.href = '/dashboard.html';
      } catch (err) {
        ui.toast(err.message, 'error');
      }
    });
  }

  // Cleanup on unload
  window.addEventListener('beforeunload', () => {
    if (socket && projectId) {
      socket.emit('leaveProject', projectId);
    }
  });
});
