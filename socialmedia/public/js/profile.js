let currentProfileId = null;

document.addEventListener('DOMContentLoaded', async () => {
  if (!requireAuth()) return;
  initNavbar();

  const params = new URLSearchParams(window.location.search);
  const userId = params.get('id');
  const currentUser = API.getUser();

  if (!userId) {
    if (currentUser) {
      window.location.href = `/profile.html?id=${currentUser._id}`;
    } else {
      window.location.href = '/login.html';
    }
    return;
  }

  currentProfileId = userId;

  const editForm = document.getElementById('edit-profile-form');
  if (editForm) {
    editForm.addEventListener('submit', saveProfile);
  }

  const editPostForm = document.getElementById('edit-post-form');
  if (editPostForm) {
    editPostForm.addEventListener('submit', saveEditPost);
  }

  await loadProfile(userId);
});

async function loadProfile(userId) {
  const container = document.getElementById('profile-content');
  if (!container) return;

  container.innerHTML = '<div class="loading"><div class="spinner"></div><p>Loading profile...</p></div>';

  try {
    const data = await API.get(`/api/users/${userId}`);
    const { user, posts } = data;

    let actionHtml = '';
    if (user.isOwnProfile) {
      actionHtml = `<button class="btn btn-secondary" type="button" onclick="openEditProfile()">Edit Profile</button>`;
    } else if (user.isFollowing) {
      actionHtml = `<button class="btn btn-secondary" type="button" id="follow-btn" onclick="unfollowUser()">Unfollow</button>`;
    } else {
      actionHtml = `<button class="btn btn-primary" type="button" id="follow-btn" onclick="followUser()">Follow</button>`;
    }

    const postsHtml = posts.length
      ? posts.map((p) => createPostCard(p)).join('')
      : `
        <div class="empty-state">
          <h3>No posts yet</h3>
          <p>${user.isOwnProfile ? 'Share your first post from the home feed!' : 'This user has not posted anything yet.'}</p>
        </div>
      `;

    container.innerHTML = `
      <div class="card">
        <div class="profile-header">
          <img
            class="profile-avatar"
            src="${escapeHtml(user.profilePicture)}"
            alt="${escapeHtml(user.username)}"
            onerror="this.src='https://ui-avatars.com/api/?name=User&background=4f46e5&color=fff'"
          >
          <h1 class="profile-username">${escapeHtml(user.username)}</h1>
          <p class="profile-bio">${escapeHtml(user.bio || 'No bio yet')}</p>
          <div class="profile-stats">
            <div class="profile-stat" onclick="showFollowers()">
              <span class="profile-stat-count" id="followers-count">${user.followersCount}</span>
              <span class="profile-stat-label">Followers</span>
            </div>
            <div class="profile-stat" onclick="showFollowing()">
              <span class="profile-stat-count" id="following-count">${user.followingCount}</span>
              <span class="profile-stat-label">Following</span>
            </div>
            <div class="profile-stat">
              <span class="profile-stat-count">${posts.length}</span>
              <span class="profile-stat-label">Posts</span>
            </div>
          </div>
          <div class="profile-actions">
            ${actionHtml}
          </div>
        </div>
      </div>
      <h2 class="profile-posts-title">Posts</h2>
      <div id="profile-posts">${postsHtml}</div>
    `;

    if (user.isOwnProfile) {
      document.getElementById('edit-username').value = user.username;
      document.getElementById('edit-bio').value = user.bio || '';
      document.getElementById('edit-picture').value = user.profilePicture || '';
    }
  } catch (error) {
    container.innerHTML = `
      <div class="empty-state">
        <h3>Profile not found</h3>
        <p>${escapeHtml(error.message)}</p>
        <a href="/index.html" class="btn btn-primary" style="width:auto;margin-top:1rem;display:inline-flex;">Go Home</a>
      </div>
    `;
  }
}

function openEditProfile() {
  openModal('edit-profile-modal');
}

async function saveProfile(event) {
  event.preventDefault();
  const username = document.getElementById('edit-username').value.trim();
  const bio = document.getElementById('edit-bio').value.trim();
  const profilePicture = document.getElementById('edit-picture').value.trim();
  const btn = event.target.querySelector('button[type="submit"]');

  if (!username || username.length < 3) {
    showToast('Username must be at least 3 characters', 'error');
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Saving...';

  try {
    const data = await API.put('/api/users/profile', {
      username,
      bio,
      profilePicture
    });
    API.setUser(data.user);
    closeModal('edit-profile-modal');
    showToast('Profile updated!', 'success');
    await loadProfile(currentProfileId);
  } catch (error) {
    showToast(error.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Save Changes';
  }
}

async function followUser() {
  const btn = document.getElementById('follow-btn');
  if (btn) btn.disabled = true;

  try {
    const data = await API.post(`/api/users/${currentProfileId}/follow`);
    showToast(data.message, 'success');

    const countEl = document.getElementById('followers-count');
    if (countEl) countEl.textContent = data.followersCount;

    if (btn) {
      btn.textContent = 'Unfollow';
      btn.className = 'btn btn-secondary';
      btn.onclick = unfollowUser;
      btn.disabled = false;
    }

    const me = await API.get('/api/auth/me');
    API.setUser(me.user);
  } catch (error) {
    showToast(error.message, 'error');
    if (btn) btn.disabled = false;
  }
}

async function unfollowUser() {
  const btn = document.getElementById('follow-btn');
  if (btn) btn.disabled = true;

  try {
    const data = await API.post(`/api/users/${currentProfileId}/unfollow`);
    showToast(data.message, 'success');

    const countEl = document.getElementById('followers-count');
    if (countEl) countEl.textContent = data.followersCount;

    if (btn) {
      btn.textContent = 'Follow';
      btn.className = 'btn btn-primary';
      btn.onclick = followUser;
      btn.disabled = false;
    }

    const me = await API.get('/api/auth/me');
    API.setUser(me.user);
  } catch (error) {
    showToast(error.message, 'error');
    if (btn) btn.disabled = false;
  }
}

async function showFollowers() {
  openModal('user-list-modal');
  document.getElementById('user-list-title').textContent = 'Followers';
  const body = document.getElementById('user-list-body');
  body.innerHTML = '<div class="loading"><div class="spinner"></div></div>';

  try {
    const data = await API.get(`/api/users/${currentProfileId}/followers`);
    if (!data.followers.length) {
      body.innerHTML = '<div class="empty-state"><p>No followers yet</p></div>';
      return;
    }
    body.innerHTML = data.followers
      .map(
        (u) => `
      <div class="user-list-item" onclick="goToProfile('${u._id}'); closeModal('user-list-modal');">
        <img class="user-list-avatar" src="${escapeHtml(u.profilePicture)}" alt="${escapeHtml(u.username)}"
          onerror="this.src='https://ui-avatars.com/api/?name=User&background=4f46e5&color=fff'">
        <div>
          <div class="user-list-name">${escapeHtml(u.username)}</div>
          <div class="user-list-bio">${escapeHtml(u.bio || '')}</div>
        </div>
      </div>
    `
      )
      .join('');
  } catch (error) {
    body.innerHTML = `<div class="empty-state"><p>${escapeHtml(error.message)}</p></div>`;
  }
}

async function showFollowing() {
  openModal('user-list-modal');
  document.getElementById('user-list-title').textContent = 'Following';
  const body = document.getElementById('user-list-body');
  body.innerHTML = '<div class="loading"><div class="spinner"></div></div>';

  try {
    const data = await API.get(`/api/users/${currentProfileId}/following`);
    if (!data.following.length) {
      body.innerHTML = '<div class="empty-state"><p>Not following anyone yet</p></div>';
      return;
    }
    body.innerHTML = data.following
      .map(
        (u) => `
      <div class="user-list-item" onclick="goToProfile('${u._id}'); closeModal('user-list-modal');">
        <img class="user-list-avatar" src="${escapeHtml(u.profilePicture)}" alt="${escapeHtml(u.username)}"
          onerror="this.src='https://ui-avatars.com/api/?name=User&background=4f46e5&color=fff'">
        <div>
          <div class="user-list-name">${escapeHtml(u.username)}</div>
          <div class="user-list-bio">${escapeHtml(u.bio || '')}</div>
        </div>
      </div>
    `
      )
      .join('');
  } catch (error) {
    body.innerHTML = `<div class="empty-state"><p>${escapeHtml(error.message)}</p></div>`;
  }
}
