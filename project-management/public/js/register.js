document.addEventListener('DOMContentLoaded', () => {
  const { api, setToken, redirectIfAuthed } = window.PMT;
  redirectIfAuthed();

  const form = document.getElementById('registerForm');
  const errorAlert = document.getElementById('errorAlert');
  const submitBtn = document.getElementById('submitBtn');

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

    const name = form.name.value.trim();
    const username = form.username.value.trim();
    const email = form.email.value.trim();
    const password = form.password.value;
    const confirmPassword = form.confirmPassword.value;

    if (!name || !username || !email || !password || !confirmPassword) {
      showError('All fields are required.');
      return;
    }

    if (password.length < 6) {
      showError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      showError('Passwords do not match.');
      return;
    }

    submitBtn.disabled = true;
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Creating account...';

    try {
      const data = await api('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, username, email, password, confirmPassword })
      });

      setToken(data.token);
      window.location.href = '/dashboard.html';
    } catch (err) {
      showError(err.message || 'Registration failed.');
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    }
  });
});
