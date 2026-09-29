/**
 * Integration test script using an in-memory MongoDB.
 * Run: node scripts/test-api.js
 */
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

process.env.JWT_SECRET = 'test_jwt_secret_for_api_tests';
process.env.PORT = '5055';

async function request(base, method, path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${base}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });

  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

async function run() {
  const mongod = await MongoMemoryServer.create({
    instance: { launchTimeout: 60000 }
  });
  process.env.MONGODB_URI = mongod.getUri();

  const { app } = require('../server');
  await mongoose.connect(process.env.MONGODB_URI);

  const server = app.listen(5055);
  const base = 'http://127.0.0.1:5055';
  let passed = 0;
  let failed = 0;

  const assert = (name, condition, detail = '') => {
    if (condition) {
      console.log(`  PASS: ${name}`);
      passed++;
    } else {
      console.log(`  FAIL: ${name}${detail ? ' — ' + detail : ''}`);
      failed++;
    }
  };

  try {
    console.log('\n=== Health ===');
    let r = await request(base, 'GET', '/api/health');
    assert('GET /api/health', r.status === 200 && r.data.success);

    console.log('\n=== Auth ===');
    r = await request(base, 'POST', '/api/auth/register', {
      username: 'alice',
      email: 'alice@test.com',
      password: 'password123',
      confirmPassword: 'password123'
    });
    assert('Register user', r.status === 201 && r.data.token, JSON.stringify(r.data));
    const aliceToken = r.data.token;
    const aliceId = r.data.user._id;

    r = await request(base, 'POST', '/api/auth/register', {
      username: 'alice',
      email: 'other@test.com',
      password: 'password123',
      confirmPassword: 'password123'
    });
    assert('Reject duplicate username', r.status === 400);

    r = await request(base, 'POST', '/api/auth/register', {
      username: 'bob',
      email: 'bob@test.com',
      password: 'password123',
      confirmPassword: 'password123'
    });
    assert('Register second user', r.status === 201);
    const bobToken = r.data.token;
    const bobId = r.data.user._id;

    r = await request(base, 'POST', '/api/auth/login', {
      login: 'alice',
      password: 'password123'
    });
    assert('Login with username', r.status === 200 && r.data.token);

    r = await request(base, 'POST', '/api/auth/login', {
      login: 'alice@test.com',
      password: 'wrong'
    });
    assert('Reject bad password', r.status === 401);

    r = await request(base, 'GET', '/api/auth/me', null, aliceToken);
    assert('GET /api/auth/me', r.status === 200 && r.data.user.username === 'alice');
    assert('Password not exposed', !r.data.user.password);

    console.log('\n=== Posts ===');
    r = await request(base, 'POST', '/api/posts', { content: 'Hello world!' }, aliceToken);
    assert('Create post', r.status === 201 && r.data.post.content === 'Hello world!');
    const postId = r.data.post._id;

    r = await request(base, 'POST', '/api/posts', { content: '  ' }, aliceToken);
    assert('Reject empty post', r.status === 400);

    r = await request(base, 'GET', '/api/posts', null, aliceToken);
    assert('Get feed', r.status === 200 && r.data.posts.length >= 1);

    r = await request(base, 'PUT', `/api/posts/${postId}`, { content: 'Updated hello' }, aliceToken);
    assert('Edit own post', r.status === 200 && r.data.post.content === 'Updated hello');

    r = await request(base, 'PUT', `/api/posts/${postId}`, { content: 'Hack' }, bobToken);
    assert('Block edit by non-owner', r.status === 403);

    console.log('\n=== Likes ===');
    r = await request(base, 'POST', `/api/posts/${postId}/like`, {}, bobToken);
    assert('Like post', r.status === 200 && r.data.likedByMe === true && r.data.likeCount === 1);

    r = await request(base, 'POST', `/api/posts/${postId}/like`, {}, bobToken);
    assert('Block double like', r.status === 400);

    r = await request(base, 'POST', `/api/posts/${postId}/unlike`, {}, bobToken);
    assert('Unlike post', r.status === 200 && r.data.likedByMe === false);

    console.log('\n=== Comments ===');
    r = await request(base, 'POST', `/api/posts/${postId}/comments`, { content: 'Nice post!' }, bobToken);
    assert('Add comment', r.status === 201);
    const commentId = r.data.comment._id;

    r = await request(base, 'POST', `/api/posts/${postId}/comments`, { content: '' }, bobToken);
    assert('Reject empty comment', r.status === 400);

    r = await request(base, 'GET', `/api/posts/${postId}/comments`, null, aliceToken);
    assert('Get comments', r.status === 200 && r.data.comments.length === 1);

    r = await request(base, 'DELETE', `/api/comments/${commentId}`, null, aliceToken);
    assert('Block delete comment by non-owner', r.status === 403);

    r = await request(base, 'DELETE', `/api/comments/${commentId}`, null, bobToken);
    assert('Delete own comment', r.status === 200);

    console.log('\n=== Follow ===');
    r = await request(base, 'POST', `/api/users/${bobId}/follow`, {}, aliceToken);
    assert('Follow user', r.status === 200 && r.data.followersCount === 1);

    r = await request(base, 'POST', `/api/users/${aliceId}/follow`, {}, aliceToken);
    assert('Block self-follow', r.status === 400);

    r = await request(base, 'GET', `/api/users/${bobId}`, null, aliceToken);
    assert('Profile shows following', r.status === 200 && r.data.user.isFollowing === true);
    assert('Followers count', r.data.user.followersCount === 1);

    r = await request(base, 'POST', `/api/users/${bobId}/unfollow`, {}, aliceToken);
    assert('Unfollow user', r.status === 200 && r.data.followersCount === 0);

    console.log('\n=== Profile & Search ===');
    r = await request(base, 'PUT', '/api/users/profile', {
      username: 'alice_updated',
      bio: 'Hello bio',
      profilePicture: 'https://example.com/pic.jpg'
    }, aliceToken);
    assert('Edit profile', r.status === 200 && r.data.user.bio === 'Hello bio');

    r = await request(base, 'GET', '/api/users/search?q=bob', null, aliceToken);
    assert('Search users', r.status === 200 && r.data.users.some((u) => u.username === 'bob'));

    r = await request(base, 'DELETE', `/api/posts/${postId}`, null, bobToken);
    assert('Block delete by non-owner', r.status === 403);

    r = await request(base, 'DELETE', `/api/posts/${postId}`, null, aliceToken);
    assert('Delete own post', r.status === 200);

    r = await request(base, 'GET', '/api/posts', null);
    assert('Reject unauthenticated feed', r.status === 401);

    console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
  } finally {
    server.close();
    await mongoose.disconnect();
    await mongod.stop();
  }

  process.exit(failed > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
