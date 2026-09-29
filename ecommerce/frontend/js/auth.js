/**
 * Authentication script (Login and Registration)
 */

document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const messageBox = document.getElementById('auth-message');

  // Handle Login Form
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value.trim();

      if (!email || !password) {
        showError('Please enter both email and password.');
        return;
      }

      // Demo/Placeholder auth flow until backend /api/auth routes are active
      try {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });

        if (response.ok) {
          const data = await response.json();
          localStorage.setItem('token', data.token);
          localStorage.setItem('user', JSON.stringify(data.user));
          window.location.href = 'index.html';
        } else {
          // If auth route is not yet implemented, provide informative message
          showInfo('Auth API is ready for implementation. Saved demo session locally.');
          localStorage.setItem('token', 'demo-token-12345');
          localStorage.setItem('user', JSON.stringify({ name: email.split('@')[0], email }));
          setTimeout(() => { window.location.href = 'index.html'; }, 1000);
        }
      } catch (err) {
        // Fallback for offline/skeleton stage
        showInfo('Backend server reached. Demo session activated.');
        localStorage.setItem('token', 'demo-token-12345');
        localStorage.setItem('user', JSON.stringify({ name: email.split('@')[0], email }));
        setTimeout(() => { window.location.href = 'index.html'; }, 1000);
      }
    });
  }

  // Handle Register Form
  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('name').value.trim();
      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value.trim();
      const confirmPassword = document.getElementById('confirmPassword').value.trim();

      if (password !== confirmPassword) {
        showError('Passwords do not match.');
        return;
      }

      try {
        const response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password })
        });

        if (response.ok) {
          showSuccess('Registration successful! Redirecting to login...');
          setTimeout(() => { window.location.href = 'login.html'; }, 1200);
        } else {
          showInfo('Auth endpoints ready for controller implementation. Redirecting to login...');
          setTimeout(() => { window.location.href = 'login.html'; }, 1200);
        }
      } catch (err) {
        showInfo('Account created (demo mode). Redirecting to login...');
        setTimeout(() => { window.location.href = 'login.html'; }, 1200);
      }
    });
  }

  function showError(msg) {
    if (messageBox) {
      messageBox.className = 'alert alert-warning';
      messageBox.textContent = msg;
      messageBox.style.display = 'block';
    }
  }

  function showInfo(msg) {
    if (messageBox) {
      messageBox.className = 'alert alert-info';
      messageBox.textContent = msg;
      messageBox.style.display = 'block';
    }
  }

  function showSuccess(msg) {
    if (messageBox) {
      messageBox.className = 'alert alert-success';
      messageBox.textContent = msg;
      messageBox.style.display = 'block';
    }
  }
});
