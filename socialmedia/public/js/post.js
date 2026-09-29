function createPostCard(post) {
  const likedClass = post.likedByMe ? 'liked' : '';
  const heartFill = post.likedByMe
    ? '<path fill="currentColor" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>'
    : '<path fill="none" stroke="currentColor" stroke-width="2" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>';

  const ownerActions = post.isOwner
    ? `
      <div class="post-actions-menu">
        <button class="btn btn-sm btn-secondary" type="button" onclick="editPost('${post._id}')">Edit</button>
        <button class="btn btn-sm btn-danger" type="button" onclick="deletePost('${post._id}')">Delete</button>
      </div>
    `
    : '';

  const imageHtml = post.image
    ? `<img class="post-image" src="${escapeHtml(post.image)}" alt="Post image" onerror="this.style.display='none'">`
    : '';

  return `
    <article class="card post-card" id="post-${post._id}" data-post-id="${post._id}">
      <div class="card-body">
        <div class="post-header">
          <img
            class="post-avatar"
            src="${escapeHtml(post.author.profilePicture)}"
            alt="${escapeHtml(post.author.username)}"
            onclick="goToProfile('${post.author._id}')"
            onerror="this.src='https://ui-avatars.com/api/?name=User&background=4f46e5&color=fff'"
          >
          <div class="post-author-info">
            <a class="post-author-name" href="/profile.html?id=${post.author._id}">${escapeHtml(post.author.username)}</a>
            <div class="post-time">${formatTime(post.createdAt)}</div>
          </div>
          ${ownerActions}
        </div>
        <div class="post-content" id="post-content-${post._id}">${escapeHtml(post.content)}</div>
        ${imageHtml}
        <div class="post-stats">
          <button class="post-stat-btn ${likedClass}" type="button" id="like-btn-${post._id}" onclick="toggleLike('${post._id}')">
            <svg viewBox="0 0 24 24" width="20" height="20">${heartFill}</svg>
            <span id="like-count-${post._id}">${post.likeCount || 0}</span>
          </button>
          <button class="post-stat-btn" type="button" onclick="toggleComments('${post._id}')">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            <span id="comment-count-${post._id}">${post.commentCount || 0}</span>
          </button>
        </div>
        <div class="comments-section" id="comments-${post._id}">
          <div class="comments-list" id="comments-list-${post._id}">
            <div class="loading"><div class="spinner"></div></div>
          </div>
          <form class="comment-form" onsubmit="submitComment(event, '${post._id}')">
            <input type="text" placeholder="Write a comment..." maxlength="500" required id="comment-input-${post._id}">
            <button class="btn btn-primary btn-sm" type="submit">Post</button>
          </form>
        </div>
      </div>
    </article>
  `;
}

function goToProfile(userId) {
  window.location.href = `/profile.html?id=${userId}`;
}

async function toggleLike(postId) {
  const btn = document.getElementById(`like-btn-${postId}`);
  const countEl = document.getElementById(`like-count-${postId}`);
  if (!btn || btn.disabled) return;

  const isLiked = btn.classList.contains('liked');
  btn.disabled = true;

  try {
    const data = isLiked
      ? await API.post(`/api/posts/${postId}/unlike`)
      : await API.post(`/api/posts/${postId}/like`);

    countEl.textContent = data.likeCount;

    if (data.likedByMe) {
      btn.classList.add('liked');
      btn.querySelector('svg').innerHTML =
        '<path fill="currentColor" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>';
    } else {
      btn.classList.remove('liked');
      btn.querySelector('svg').innerHTML =
        '<path fill="none" stroke="currentColor" stroke-width="2" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>';
    }
  } catch (error) {
    showToast(error.message, 'error');
  } finally {
    btn.disabled = false;
  }
}

async function toggleComments(postId) {
  const section = document.getElementById(`comments-${postId}`);
  if (!section) return;

  const isOpen = section.classList.contains('open');
  if (isOpen) {
    section.classList.remove('open');
    return;
  }

  section.classList.add('open');
  await loadComments(postId);
}

async function loadComments(postId) {
  const list = document.getElementById(`comments-list-${postId}`);
  if (!list) return;

  list.innerHTML = '<div class="loading"><div class="spinner"></div></div>';

  try {
    const data = await API.get(`/api/posts/${postId}/comments`);

    if (!data.comments.length) {
      list.innerHTML = '<div class="comments-empty">No comments yet. Be the first!</div>';
      return;
    }

    list.innerHTML = data.comments
      .map(
        (c) => `
      <div class="comment-item" id="comment-${c._id}">
        <img
          class="comment-avatar"
          src="${escapeHtml(c.author.profilePicture)}"
          alt="${escapeHtml(c.author.username)}"
          onclick="goToProfile('${c.author._id}')"
          onerror="this.src='https://ui-avatars.com/api/?name=User&background=4f46e5&color=fff'"
        >
        <div class="comment-body">
          <div class="comment-author" onclick="goToProfile('${c.author._id}')">${escapeHtml(c.author.username)}</div>
          <div class="comment-text">${escapeHtml(c.content)}</div>
          <div class="comment-meta">
            <span class="comment-time">${formatTime(c.createdAt)}</span>
            ${c.isOwner ? `<button class="comment-delete" type="button" onclick="deleteComment('${c._id}', '${postId}')">Delete</button>` : ''}
          </div>
        </div>
      </div>
    `
      )
      .join('');
  } catch (error) {
    list.innerHTML = `<div class="comments-empty">${escapeHtml(error.message)}</div>`;
  }
}

async function submitComment(event, postId) {
  event.preventDefault();
  const input = document.getElementById(`comment-input-${postId}`);
  const content = input.value.trim();

  if (!content) {
    showToast('Comment cannot be empty', 'error');
    return;
  }

  const btn = event.target.querySelector('button[type="submit"]');
  btn.disabled = true;

  try {
    await API.post(`/api/posts/${postId}/comments`, { content });
    input.value = '';
    showToast('Comment added', 'success');

    const countEl = document.getElementById(`comment-count-${postId}`);
    if (countEl) {
      countEl.textContent = parseInt(countEl.textContent || '0', 10) + 1;
    }

    await loadComments(postId);
  } catch (error) {
    showToast(error.message, 'error');
  } finally {
    btn.disabled = false;
  }
}

async function deleteComment(commentId, postId) {
  const confirmed = await confirmDialog('Are you sure you want to delete this comment?');
  if (!confirmed) return;

  try {
    await API.delete(`/api/comments/${commentId}`);
    showToast('Comment deleted', 'success');

    const countEl = document.getElementById(`comment-count-${postId}`);
    if (countEl) {
      const current = parseInt(countEl.textContent || '0', 10);
      countEl.textContent = Math.max(0, current - 1);
    }

    await loadComments(postId);
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function deletePost(postId) {
  const confirmed = await confirmDialog('Are you sure you want to delete this post? This cannot be undone.');
  if (!confirmed) return;

  try {
    await API.delete(`/api/posts/${postId}`);
    const card = document.getElementById(`post-${postId}`);
    if (card) card.remove();
    showToast('Post deleted', 'success');

    const feed = document.getElementById('feed');
    if (feed && !feed.querySelector('.post-card')) {
      feed.innerHTML = `
        <div class="empty-state">
          <h3>No posts yet</h3>
          <p>Be the first to share something!</p>
        </div>
      `;
    }
  } catch (error) {
    showToast(error.message, 'error');
  }
}

function editPost(postId) {
  const contentEl = document.getElementById(`post-content-${postId}`);
  const currentContent = contentEl ? contentEl.textContent : '';
  const card = document.getElementById(`post-${postId}`);
  const img = card ? card.querySelector('.post-image') : null;
  const currentImage = img ? img.getAttribute('src') : '';

  document.getElementById('edit-post-id').value = postId;
  document.getElementById('edit-post-content').value = currentContent;
  document.getElementById('edit-post-image').value = currentImage || '';
  openModal('edit-post-modal');
}

async function saveEditPost(event) {
  event.preventDefault();
  const postId = document.getElementById('edit-post-id').value;
  const content = document.getElementById('edit-post-content').value.trim();
  const image = document.getElementById('edit-post-image').value.trim();
  const btn = event.target.querySelector('button[type="submit"]');

  if (!content) {
    showToast('Post content cannot be empty', 'error');
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Saving...';

  try {
    const data = await API.put(`/api/posts/${postId}`, { content, image });
    closeModal('edit-post-modal');
    showToast('Post updated', 'success');

    const card = document.getElementById(`post-${postId}`);
    if (card) {
      const newCard = createPostCard(data.post);
      card.outerHTML = newCard;
    }
  } catch (error) {
    showToast(error.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Save Changes';
  }
}

async function createPost(event) {
  event.preventDefault();
  const contentEl = document.getElementById('new-post-content');
  const imageEl = document.getElementById('new-post-image');
  const content = contentEl.value.trim();
  const image = imageEl.value.trim();
  const btn = event.target.querySelector('button[type="submit"]');

  if (!content) {
    showToast('Post content cannot be empty', 'error');
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Posting...';

  try {
    const data = await API.post('/api/posts', { content, image });
    contentEl.value = '';
    imageEl.value = '';
    showToast('Post created!', 'success');

    const feed = document.getElementById('feed');
    if (feed) {
      const empty = feed.querySelector('.empty-state');
      if (empty) empty.remove();

      const loading = feed.querySelector('.loading');
      if (loading) loading.remove();

      feed.insertAdjacentHTML('afterbegin', createPostCard(data.post));
    }
  } catch (error) {
    showToast(error.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Post';
  }
}
