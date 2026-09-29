/**
 * Main application script
 * Shared configuration, navigation helpers, toast notifications, and auth state
 */

// Central API Configuration (Configurable for local vs deployed environments)
const API_CONFIG = {
  get baseURL() {
    // 1. Check for manual override in localStorage
    const custom = localStorage.getItem('API_URL');
    if (custom) return custom.replace(/\/$/, '');

    // 2. If served directly by the Express backend on port 5000
    if (window.location.port === '5000' || window.location.origin.includes(':5000')) {
      return '';
    }

    // 3. Fallback for VS Code Live Server (port 5500, 3000, or file://)
    return 'http://localhost:5000';
  },

  // Helper to easily change the API base URL in development
  setBaseURL(newUrl) {
    if (newUrl) {
      localStorage.setItem('API_URL', newUrl);
    } else {
      localStorage.removeItem('API_URL');
    }
    console.log(`📡 API Base URL set to: ${this.baseURL}`);
  }
};

// Utility: Read cart from localStorage
function getCart() {
  try {
    const cart = localStorage.getItem('cart');
    return cart ? JSON.parse(cart) : [];
  } catch (e) {
    console.error('Error reading cart from localStorage', e);
    return [];
  }
}

// Utility: Save cart to localStorage
function saveCart(cart) {
  try {
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartBadge();
  } catch (e) {
    console.error('Error saving cart to localStorage', e);
  }
}

// Utility: Update cart badge count in navbar
function updateCartBadge() {
  const badge = document.querySelector('.cart-badge');
  if (badge) {
    const cart = getCart();
    const totalItems = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
    badge.textContent = totalItems;
  }
}

// Utility: Get Auth Token
function getAuthToken() {
  return localStorage.getItem('token');
}

// Utility: Get Current User
function getCurrentUser() {
  try {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  } catch (e) {
    return null;
  }
}

// Utility: Format currency
function formatCurrency(amount) {
  const num = Number(amount);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(isNaN(num) ? 0 : num);
}

// Utility: Show sleek toast notifications
function showToast(message, type = 'success') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  const icon = type === 'success' ? '✓' : type === 'warning' ? '⚠️' : 'ℹ️';
  toast.innerHTML = `<span class="toast-icon">${icon}</span> <span>${message}</span>`;

  container.appendChild(toast);

  // Trigger animation
  setTimeout(() => toast.classList.add('show'), 10);

  // Remove toast after 3.5 seconds
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
  updateCartBadge();
  
  // Highlight active link in navbar
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a').forEach(link => {
    const href = link.getAttribute('href');
    if (href === currentPath || (currentPath === '' && href === 'index.html')) {
      link.classList.add('active');
    }
  });

  // Update navigation items based on login status
  const user = getCurrentUser();
  const authContainer = document.getElementById('auth-nav-container');

  if (authContainer) {
    if (user) {
      authContainer.innerHTML = `
        <span class="user-greeting">Hi, <strong>${user.name || 'User'}</strong></span>
        <a href="#" id="logout-btn" class="nav-btn nav-btn-outline">Logout</a>
      `;
      document.getElementById('logout-btn')?.addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        showToast('Logged out successfully', 'info');
        setTimeout(() => { window.location.href = 'index.html'; }, 800);
      });
    } else {
      authContainer.innerHTML = `
        <a href="login.html" class="nav-link">Login</a>
        <a href="register.html" class="nav-btn nav-btn-primary">Register</a>
      `;
    }
  }
});
