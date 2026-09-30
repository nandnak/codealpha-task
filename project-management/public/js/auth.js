(function () {
  const { getToken, clearToken, api } = window.PMT;
  const publicPages = ['/login.html', '/register.html', '/index.html', '/'];

  function path() {
    return window.location.pathname;
  }

  function isPublic() {
    return publicPages.includes(path()) || path().endsWith('/');
  }

  window.PMT.requireAuth = async function requireAuth() {
    if (!getToken()) {
      window.location.href = '/login.html';
      return null;
    }
    try {
      const data = await api('/api/auth/me');
      window.PMT.currentUser = data.user;
      return data.user;
    } catch (err) {
      clearToken();
      window.location.href = '/login.html';
      return null;
    }
  };

  window.PMT.logout = function logout() {
    clearToken();
    window.location.href = '/login.html';
  };

  window.PMT.redirectIfAuthed = function redirectIfAuthed() {
    if (getToken() && isPublic()) {
      window.location.href = '/dashboard.html';
    }
  };
})();
