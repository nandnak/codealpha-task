document.addEventListener('DOMContentLoaded', () => {
  const { api, setToken, redirectIfAuthed } = window.PMT;
  redirectIfAuthed();

  const form = document.getElementById('loginForm');
  const errorAlert = document.getElementById('errorAlert');
  const submitBtn = document.getElementById('submitBtn');
  const togglePassBtn = document.getElementById('togglePassBtn');
  const passwordInput = document.getElementById('password');

  if (togglePassBtn && passwordInput) {
    togglePassBtn.addEventListener('click', () => {
      const isPass = passwordInput.type === 'password';
      passwordInput.type = isPass ? 'text' : 'password';
      togglePassBtn.textContent = isPass ? 'Hide' : 'Show';
    });
  }

  function showError(msg) {
    if (!errorAlert) return;
    errorAlert.textContent = msg;
    errorAlert.classList.add('show');
  }

  function hideError() {
    if (!errorAlert) return;
    errorAlert.textContent = '';
    errorAlert.classList.remove('show');
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError();

    const identifier = form.identifier.value.trim();
    const password = form.password.value;

    if (!identifier || !password) {
      showError('Please enter both email/username and password.');
      return;
    }

    submitBtn.disabled = true;
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Signing in...';

    try {
      const data = await api('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ identifier, password })
      });

      setToken(data.token);
      window.location.href = '/dashboard.html';
    } catch (err) {
      showError(err.message || 'Login failed. Please check your credentials.');
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    }
  });

  // Demo account quick filler buttons
  const demoButtons = document.querySelectorAll('[data-demo-id]');
  demoButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      form.identifier.value = btn.dataset.demoId;
      form.password.focus();
    });
  });
});
