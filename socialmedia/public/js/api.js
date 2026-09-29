const API = {
  getToken() {
    return localStorage.getItem('token');
  },

  setToken(token) {
    localStorage.setItem('token', token);
  },

  clearToken() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  getUser() {
    const raw = localStorage.getItem('user');
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },

  setUser(user) {
    localStorage.setItem('user', JSON.stringify(user));
  },

  isAuthenticated() {
    return !!this.getToken();
  },

  async request(endpoint, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    const token = this.getToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    try {
      const response = await fetch(endpoint, {
        ...options,
        headers
      });

      let data;
      try {
        data = await response.json();
      } catch {
        data = { success: false, message: 'Invalid server response' };
      }

      if (response.status === 401) {
        this.clearToken();
        if (!window.location.pathname.includes('login') && !window.location.pathname.includes('register')) {
          window.location.href = '/login.html';
        }
        throw new Error(data.message || 'Session expired. Please log in again.');
      }

      if (!response.ok) {
        throw new Error(data.message || 'Something went wrong');
      }

      return data;
    } catch (error) {
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error('Network error. Please check your connection.');
      }
      throw error;
    }
  },

  get(endpoint) {
    return this.request(endpoint);
  },

  post(endpoint, body) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(body)
    });
  },

  put(endpoint, body) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body)
    });
  },

  delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }
};

function showToast(message, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

function formatTime(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now - date) / 1000);

  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text || '';
  return div.innerHTML;
}

function requireAuth() {
  if (!API.isAuthenticated()) {
    window.location.href = '/login.html';
    return false;
  }
  return true;
}

function redirectIfAuthenticated() {
  if (API.isAuthenticated()) {
    window.location.href = '/index.html';
    return true;
  }
  return false;
}

function openModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('open');
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('open');
}

function confirmDialog(message) {
  return new Promise((resolve) => {
    const overlay = document.getElementById('confirm-modal');
    const msgEl = document.getElementById('confirm-message');
    const yesBtn = document.getElementById('confirm-yes');
    const noBtns = document.querySelectorAll('[data-confirm-cancel]');

    if (!overlay || !yesBtn) {
      resolve(window.confirm(message));
      return;
    }

    msgEl.textContent = message;
    openModal('confirm-modal');

    const cleanup = (result) => {
      closeModal('confirm-modal');
      yesBtn.removeEventListener('click', onYes);
      noBtns.forEach((btn) => btn.removeEventListener('click', onNo));
      resolve(result);
    };

    const onYes = () => cleanup(true);
    const onNo = () => cleanup(false);

    yesBtn.addEventListener('click', onYes);
    noBtns.forEach((btn) => btn.addEventListener('click', onNo));
  });
}

function initNavbar() {
  const toggle = document.getElementById('nav-toggle');
  const links = document.getElementById('nav-links');
  if (toggle && links) {
    toggle.addEventListener('click', () => {
      links.classList.toggle('open');
    });
  }

  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      API.clearToken();
      showToast('Logged out successfully', 'success');
      setTimeout(() => {
        window.location.href = '/login.html';
      }, 500);
    });
  }

  const user = API.getUser();
  const profileLink = document.getElementById('nav-profile');
  if (profileLink && user) {
    profileLink.href = `/profile.html?id=${user._id}`;
  }
}

function getConfirmModalHTML() {
  return `
    <div class="modal-overlay" id="confirm-modal">
      <div class="modal">
        <div class="modal-header">
          <h3>Confirm</h3>
          <button class="modal-close" type="button" data-confirm-cancel>&times;</button>
        </div>
        <div class="modal-body">
          <p class="confirm-message" id="confirm-message"></p>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" type="button" data-confirm-cancel>Cancel</button>
          <button class="btn btn-danger" type="button" id="confirm-yes">Delete</button>
        </div>
      </div>
    </div>
  `;
}

document.addEventListener('DOMContentLoaded', () => {
  if (!document.getElementById('confirm-modal')) {
    document.body.insertAdjacentHTML('beforeend', getConfirmModalHTML());
  }
});
