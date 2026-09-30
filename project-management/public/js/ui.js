(function () {
  function initials(name) {
    return String(name || '?')
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0].toUpperCase())
      .join('');
  }

  function color(seed) {
    let hash = 0;
    const s = String(seed || 'user');
    for (let i = 0; i < s.length; i += 1) hash = s.charCodeAt(i) + ((hash << 5) - hash);
    const colors = ['#4f46e5', '#0284c7', '#7c3aed', '#059669', '#d97706', '#dc2626', '#0f766e', '#2563eb'];
    return colors[Math.abs(hash) % colors.length];
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function escapeAttr(str) {
    return escapeHtml(str);
  }

  function avatar(user, size) {
    if (!user) return '<div class="avatar sm" aria-hidden="true" title="Unassigned">?</div>';
    const cls = size === 'lg' ? 'avatar lg' : size === 'md' ? 'avatar md' : size === 'sm' ? 'avatar sm' : 'avatar';
    if (user.avatar) {
      return `<img class="avatar-img ${size || ''}" src="${escapeAttr(user.avatar)}" alt="${escapeAttr(user.name)}" title="${escapeAttr(user.name)} (@${escapeAttr(user.username)})">`;
    }
    return `<div class="${cls}" style="background:${color(user.username || user.name)}" title="${escapeAttr(user.name)} (@${escapeAttr(user.username)})" aria-hidden="true">${initials(user.name)}</div>`;
  }

  function timeAgo(date) {
    if (!date) return '';
    const d = new Date(date);
    const diff = (Date.now() - d.getTime()) / 1000;
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return d.toLocaleDateString();
  }

  function formatDate(date) {
    if (!date) return 'No due date';
    const d = new Date(date);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function statusLabel(status) {
    return {
      todo: 'To Do',
      'in-progress': 'In Progress',
      review: 'In Review',
      completed: 'Completed'
    }[status] || status;
  }

  function statusBadge(status) {
    const s = status || 'todo';
    return `<span class="badge st-${s}"><span class="badge-dot"></span>${statusLabel(s)}</span>`;
  }

  function priorityBadge(priority) {
    const p = priority || 'medium';
    return `<span class="badge pr-${p}"><span class="badge-dot"></span>${p.toUpperCase()}</span>`;
  }

  function dueChip(dueDate, status) {
    if (!dueDate) return '';
    const due = new Date(dueDate);
    const now = new Date();
    const isCompleted = status === 'completed';
    const isOverdue = !isCompleted && due < now;
    const diffHours = (due.getTime() - now.getTime()) / (1000 * 3600);
    const isDueSoon = !isCompleted && !isOverdue && diffHours > 0 && diffHours < 48;

    let cls = 'task-due';
    let icon = '📅';
    if (isOverdue) {
      cls += ' overdue';
      icon = '⚠️';
    } else if (isDueSoon) {
      cls += ' due-soon';
      icon = '⏳';
    }

    return `<span class="${cls}" title="Due date: ${due.toLocaleDateString()}">${icon} ${due.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>`;
  }

  function toast(message, type = 'info') {
    let wrap = document.querySelector('.toast-wrap');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.className = 'toast-wrap';
      wrap.setAttribute('role', 'status');
      wrap.setAttribute('aria-live', 'polite');
      document.body.appendChild(wrap);
    }
    const el = document.createElement('div');
    el.className = 'toast';
    const icon = type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ';
    el.innerHTML = `<span>${icon}</span> <span>${escapeHtml(message)}</span>`;
    wrap.appendChild(el);
    setTimeout(() => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(10px)';
      el.style.transition = 'all 0.3s ease';
      setTimeout(() => el.remove(), 300);
    }, 3500);
  }

  function greeting(name) {
    const hour = new Date().getHours();
    const part = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
    return `${part}, ${escapeHtml(name || 'there')}!`;
  }

  function emptyState(title, text, actionHtml = '') {
    return `
      <div class="empty">
        <div class="empty-icon" aria-hidden="true">✦</div>
        <strong>${escapeHtml(title)}</strong>
        <p>${escapeHtml(text)}</p>
        ${actionHtml ? `<div style="margin-top:16px;">${actionHtml}</div>` : ''}
      </div>
    `;
  }

  window.PMT = window.PMT || {};
  window.PMT.ui = {
    avatar,
    escapeHtml,
    escapeAttr,
    timeAgo,
    formatDate,
    statusLabel,
    statusBadge,
    priorityBadge,
    dueChip,
    toast,
    greeting,
    emptyState
  };
})();
