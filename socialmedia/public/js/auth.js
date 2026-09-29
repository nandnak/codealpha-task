document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');

  if (loginForm) {
    redirectIfAuthenticated();

    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const errorEl = document.getElementById('form-error');
      const submitBtn = loginForm.querySelector('button[type="submit"]');
      const login = document.getElementById('login').value.trim();
      const password = document.getElementById('password').value;

      errorEl.classList.remove('visible');
      errorEl.textContent = '';

      if (!login || !password) {
        errorEl.textContent = 'Please fill in all fields';
        errorEl.classList.add('visible');
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = 'Logging in...';

      try {
        const data = await API.post('/api/auth/login', { login, password });
        API.setToken(data.token);
        API.setUser(data.user);
        showToast('Welcome back!', 'success');
        window.location.href = '/index.html';
      } catch (error) {
        errorEl.textContent = error.message;
        errorEl.classList.add('visible');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Log In';
      }
    });
  }

  if (registerForm) {
    redirectIfAuthenticated();

    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const errorEl = document.getElementById('form-error');
      const submitBtn = registerForm.querySelector('button[type="submit"]');

      const username = document.getElementById('username').value.trim();
      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;
      const confirmPassword = document.getElementById('confirmPassword').value;

      errorEl.classList.remove('visible');
      errorEl.textContent = '';

      if (!username || !email || !password || !confirmPassword) {
        errorEl.textContent = 'Please fill in all fields';
        errorEl.classList.add('visible');
        return;
      }

      if (username.length < 3) {
        errorEl.textContent = 'Username must be at least 3 characters';
        errorEl.classList.add('visible');
        return;
      }

      if (password.length < 6) {
        errorEl.textContent = 'Password must be at least 6 characters';
        errorEl.classList.add('visible');
        return;
      }

      if (password !== confirmPassword) {
        errorEl.textContent = 'Passwords do not match';
        errorEl.classList.add('visible');
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = 'Creating account...';

      try {
        const data = await API.post('/api/auth/register', {
          username,
          email,
          password,
          confirmPassword
        });
        API.setToken(data.token);
        API.setUser(data.user);
        showToast('Account created successfully!', 'success');
        window.location.href = '/index.html';
      } catch (error) {
        errorEl.textContent = error.message;
        errorEl.classList.add('visible');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Sign Up';
      }
    });
  }
});
