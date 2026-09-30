document.addEventListener('DOMContentLoaded', async () => {
  const { api, ui, mountShell } = window.PMT;

  const user = await mountShell('profile');
  if (!user) return;

  const content = document.getElementById('content');

  const avatarPresets = [
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80',
    'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=150&q=80',
    'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=150&q=80'
  ];

  content.innerHTML = `
    <div class="page-head">
      <div class="page-head-title">
        <h1>Profile & Account Settings</h1>
        <p>Manage your account personal details, avatar, and security credentials.</p>
      </div>
    </div>

    <div class="two-col" style="align-items:start;">
      <!-- Profile Information -->
      <div class="card">
        <h2 class="section-title">General Information</h2>
        <form class="form" id="profileForm">
          <div style="display:flex; align-items:center; gap:20px; margin-bottom:12px;">
            <div id="profileAvatarPreview">${ui.avatar(user, 'lg')}</div>
            <div>
              <strong style="font-size:16px; display:block;">${ui.escapeHtml(user.name)}</strong>
              <span class="muted" style="font-size:13px;">@${ui.escapeHtml(user.username)} • ${ui.escapeHtml(user.email)}</span>
            </div>
          </div>

          <div class="field">
            <label for="profileName">Full Name *</label>
            <input type="text" id="profileName" name="name" value="${ui.escapeAttr(user.name)}" required maxlength="80">
          </div>

          <div class="field">
            <label for="profileBio">Bio / Role</label>
            <textarea id="profileBio" name="bio" rows="3" placeholder="Tell your teammates what you work on..." maxlength="300">${ui.escapeHtml(user.bio || '')}</textarea>
          </div>

          <div class="field">
            <label for="profileAvatar">Avatar Image URL</label>
            <input type="url" id="profileAvatar" name="avatar" value="${ui.escapeAttr(user.avatar || '')}" placeholder="https://example.com/avatar.jpg">
            <div class="field-hint">Or choose an avatar preset:</div>
            <div style="display:flex; gap:10px; margin-top:6px; flex-wrap:wrap;">
              ${avatarPresets
                .map(
                  (url) => `
                <img src="${url}" class="avatar sm avatar-preset-choice" data-url="${url}" style="cursor:pointer; border:2px solid var(--border);" title="Use this photo">
              `
                )
                .join('')}
              <button type="button" class="btn btn-sm btn-secondary" id="clearAvatarBtn">Use Initials</button>
            </div>
          </div>

          <div style="display:flex; justify-content:flex-end; margin-top:10px;">
            <button class="btn btn-primary" type="submit" id="saveProfileBtn">Save Profile</button>
          </div>
        </form>
      </div>

      <!-- Password Change -->
      <div class="card">
        <h2 class="section-title">Security & Password</h2>
        <form class="form" id="passwordForm">
          <div class="field">
            <label for="currentPassword">Current Password</label>
            <input type="password" id="currentPassword" name="currentPassword" required>
          </div>

          <div class="field">
            <label for="newPassword">New Password</label>
            <input type="password" id="newPassword" name="newPassword" minlength="6" required>
            <div class="field-hint">At least 6 characters</div>
          </div>

          <div class="field">
            <label for="confirmNewPassword">Confirm New Password</label>
            <input type="password" id="confirmNewPassword" name="confirmNewPassword" minlength="6" required>
          </div>

          <div style="display:flex; justify-content:flex-end; margin-top:10px;">
            <button class="btn btn-secondary" type="submit" id="changePasswordBtn">Update Password</button>
          </div>
        </form>

        <div style="margin-top:28px; padding-top:20px; border-top:1px solid var(--border);">
          <strong style="display:block; font-size:14px; margin-bottom:4px;">Account Metadata</strong>
          <div class="muted" style="font-size:12px;">Member since: ${new Date(user.createdAt).toLocaleDateString(undefined, { dateStyle: 'long' })}</div>
          <div class="muted" style="font-size:12px; margin-top:2px;">User ID: <code>${user._id}</code></div>
        </div>
      </div>
    </div>
  `;

  // Avatar presets click
  document.querySelectorAll('.avatar-preset-choice').forEach((img) => {
    img.addEventListener('click', () => {
      document.getElementById('profileAvatar').value = img.dataset.url;
      updatePreview(img.dataset.url);
    });
  });

  document.getElementById('clearAvatarBtn').addEventListener('click', () => {
    document.getElementById('profileAvatar').value = '';
    updatePreview('');
  });

  document.getElementById('profileAvatar').addEventListener('input', (e) => {
    updatePreview(e.target.value.trim());
  });

  function updatePreview(url) {
    const preview = document.getElementById('profileAvatarPreview');
    const tempUser = { ...user, avatar: url };
    preview.innerHTML = ui.avatar(tempUser, 'lg');
  }

  // Profile Form Submit
  const profileForm = document.getElementById('profileForm');
  profileForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = profileForm.name.value.trim();
    const bio = profileForm.bio.value.trim();
    const avatar = profileForm.avatar.value.trim();

    if (!name) {
      ui.toast('Name cannot be empty', 'error');
      return;
    }

    const btn = document.getElementById('saveProfileBtn');
    btn.disabled = true;
    btn.textContent = 'Saving...';

    try {
      const res = await api('/api/users/profile', {
        method: 'PUT',
        body: JSON.stringify({ name, bio, avatar })
      });

      ui.toast('Profile updated successfully!', 'success');
      // Update topbar chip
      const nameEl = document.querySelector('.user-chip-name');
      if (nameEl) nameEl.textContent = res.user.name;
    } catch (err) {
      ui.toast(err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Save Profile';
    }
  });

  // Password Form Submit
  const passForm = document.getElementById('passwordForm');
  passForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const currentPassword = passForm.currentPassword.value;
    const newPassword = passForm.newPassword.value;
    const confirmNewPassword = passForm.confirmNewPassword.value;

    if (newPassword.length < 6) {
      ui.toast('New password must be at least 6 characters', 'error');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      ui.toast('New passwords do not match', 'error');
      return;
    }

    const btn = document.getElementById('changePasswordBtn');
    btn.disabled = true;
    btn.textContent = 'Updating...';

    try {
      await api('/api/users/profile', {
        method: 'PUT',
        body: JSON.stringify({ currentPassword, newPassword })
      });

      ui.toast('Password changed successfully!', 'success');
      passForm.reset();
    } catch (err) {
      ui.toast(err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Update Password';
    }
  });
});
