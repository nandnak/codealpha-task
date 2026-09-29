document.addEventListener('DOMContentLoaded', async () => {
  if (!requireAuth()) return;
  initNavbar();

  const user = API.getUser();
  const avatarImg = document.getElementById('create-post-avatar');
  if (avatarImg && user) {
    avatarImg.src = user.profilePicture;
    avatarImg.alt = user.username;
  }

  const createForm = document.getElementById('create-post-form');
  if (createForm) {
    createForm.addEventListener('submit', createPost);
  }

  const editForm = document.getElementById('edit-post-form');
  if (editForm) {
    editForm.addEventListener('submit', saveEditPost);
  }

  const searchInput = document.getElementById('search-input');
  const searchResults = document.getElementById('search-results');

  if (searchInput && searchResults) {
    let searchTimeout;
    searchInput.addEventListener('input', () => {
      clearTimeout(searchTimeout);
      const q = searchInput.value.trim();

      if (!q) {
        searchResults.innerHTML = `
          <div class="empty-state">
            <h3>Search for people</h3>
            <p>Enter a username or email to find users</p>
          </div>
        `;
        return;
      }

      searchTimeout = setTimeout(() => performSearch(q), 300);
    });
  }

  if (document.getElementById('feed')) {
    await loadFeed();
  }

  try {
    const me = await API.get('/api/auth/me');
    API.setUser(me.user);
  } catch {
    // token handling in API.request
  }
});

async function loadFeed() {
  const feed = document.getElementById('feed');
  if (!feed) return;

  feed.innerHTML = '<div class="loading"><div class="spinner"></div><p>Loading feed...</p></div>';

  try {
    const data = await API.get('/api/posts');

    if (!data.posts.length) {
      feed.innerHTML = `
        <div class="empty-state">
          <h3>No posts yet</h3>
          <p>Be the first to share something with the community!</p>
        </div>
      `;
      return;
    }

    feed.innerHTML = data.posts.map(createPostCard).join('');
  } catch (error) {
    feed.innerHTML = `
      <div class="empty-state">
        <h3>Could not load feed</h3>
        <p>${escapeHtml(error.message)}</p>
      </div>
    `;
  }
}

async function performSearch(q) {
  const searchResults = document.getElementById('search-results');
  if (!searchResults) return;

  searchResults.innerHTML = '<div class="loading"><div class="spinner"></div></div>';

  try {
    const data = await API.get(`/api/users/search?q=${encodeURIComponent(q)}`);
    const currentUser = API.getUser();

    if (!data.users.length) {
      searchResults.innerHTML = `
        <div class="empty-state">
          <h3>No users found</h3>
          <p>Try a different search term</p>
        </div>
      `;
      return;
    }

    searchResults.innerHTML = `
      <div class="card">
        ${data.users
          .map((u) => {
            const isSelf = currentUser && u._id === currentUser._id;
            const isFollowing =
              currentUser &&
              currentUser.following &&
              currentUser.following.some((f) => (f._id || f) === u._id || (f._id || f).toString() === u._id);

            let actionBtn = '';
            if (!isSelf) {
              actionBtn = isFollowing
                ? `<button class="btn btn-secondary btn-sm" type="button" onclick="event.stopPropagation(); searchUnfollow('${u._id}', this)">Unfollow</button>`
                : `<button class="btn btn-primary btn-sm" type="button" onclick="event.stopPropagation(); searchFollow('${u._id}', this)">Follow</button>`;
            }

            return `
              <div class="search-result" onclick="goToProfile('${u._id}')">
                <img
                  class="search-result-avatar"
                  src="${escapeHtml(u.profilePicture)}"
                  alt="${escapeHtml(u.username)}"
                  onerror="this.src='https://ui-avatars.com/api/?name=User&background=4f46e5&color=fff'"
                >
                <div class="search-result-info">
                  <div class="search-result-name">${escapeHtml(u.username)}</div>
                  <div class="search-result-bio">${escapeHtml(u.bio || 'No bio')}</div>
                </div>
                ${actionBtn ? `<div class="search-result-action">${actionBtn}</div>` : ''}
              </div>
            `;
          })
          .join('')}
      </div>
    `;
  } catch (error) {
    searchResults.innerHTML = `
      <div class="empty-state">
        <h3>Search failed</h3>
        <p>${escapeHtml(error.message)}</p>
      </div>
    `;
  }
}

async function searchFollow(userId, btn) {
  btn.disabled = true;
  try {
    await API.post(`/api/users/${userId}/follow`);
    showToast('Followed successfully', 'success');
    btn.textContent = 'Unfollow';
    btn.className = 'btn btn-secondary btn-sm';
    btn.onclick = function (e) {
      e.stopPropagation();
      searchUnfollow(userId, this);
    };

    const me = await API.get('/api/auth/me');
    API.setUser(me.user);
  } catch (error) {
    showToast(error.message, 'error');
  } finally {
    btn.disabled = false;
  }
}

async function searchUnfollow(userId, btn) {
  btn.disabled = true;
  try {
    await API.post(`/api/users/${userId}/unfollow`);
    showToast('Unfollowed', 'success');
    btn.textContent = 'Follow';
    btn.className = 'btn btn-primary btn-sm';
    btn.onclick = function (e) {
      e.stopPropagation();
      searchFollow(userId, this);
    };

    const me = await API.get('/api/auth/me');
    API.setUser(me.user);
  } catch (error) {
    showToast(error.message, 'error');
  } finally {
    btn.disabled = false;
  }
}
