const express = require('express');
const User = require('../models/User');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

const isValidObjectId = (id) => /^[0-9a-fA-F]{24}$/.test(id);
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// GET /api/users/search?q=
router.get('/search', protect, async (req, res) => {
  try {
    const q = (req.query.q || '').trim();

    if (!q) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a search query'
      });
    }

    const users = await User.find({
      $or: [
        { username: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } }
      ]
    })
      .select('-password')
      .limit(20);

    res.json({
      success: true,
      users,
      count: users.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Search failed. Please try again.'
    });
  }
});

// PUT /api/users/profile
router.put('/profile', protect, async (req, res) => {
  try {
    const { username, bio, profilePicture } = req.body;

    const updates = {};

    if (username !== undefined) {
      const trimmed = username.trim();
      if (trimmed.length < 3) {
        return res.status(400).json({
          success: false,
          message: 'Username must be at least 3 characters'
        });
      }
      if (trimmed.length > 30) {
        return res.status(400).json({
          success: false,
          message: 'Username cannot exceed 30 characters'
        });
      }

      const existing = await User.findOne({
        username: { $regex: new RegExp(`^${escapeRegex(trimmed)}$`, 'i') },
        _id: { $ne: req.user._id }
      });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: 'Username is already taken'
        });
      }
      updates.username = trimmed;
    }

    if (bio !== undefined) {
      if (bio.length > 300) {
        return res.status(400).json({
          success: false,
          message: 'Bio cannot exceed 300 characters'
        });
      }
      updates.bio = bio.trim();
    }

    if (profilePicture !== undefined) {
      updates.profilePicture = profilePicture.trim() || req.user.profilePicture;
    }

    const user = await User.findByIdAndUpdate(req.user._id, updates, {
      new: true,
      runValidators: true
    });

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Username is already taken'
      });
    }
    if (error.name === 'ValidationError') {
      const message = Object.values(error.errors)
        .map((e) => e.message)
        .join(', ');
      return res.status(400).json({ success: false, message });
    }
    res.status(500).json({
      success: false,
      message: 'Failed to update profile'
    });
  }
});

// GET /api/users/:id
router.get('/:id', protect, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID'
      });
    }

    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const posts = await Post.find({ author: user._id })
      .populate('author', 'username profilePicture')
      .sort({ createdAt: -1 });

    const isFollowing = user.followers.some(
      (f) => f.toString() === req.user._id.toString()
    );

    const postsWithMeta = await Promise.all(
      posts.map(async (post) => {
        const commentCount = await Comment.countDocuments({ post: post._id });
        const likedByMe = post.likes.some(
          (id) => id.toString() === req.user._id.toString()
        );
        return {
          ...post.toObject(),
          likeCount: post.likes.length,
          commentCount,
          likedByMe,
          isOwner: post.author._id.toString() === req.user._id.toString()
        };
      })
    );

    res.json({
      success: true,
      user: {
        ...user.toJSON(),
        followersCount: user.followers.length,
        followingCount: user.following.length,
        isFollowing,
        isOwnProfile: user._id.toString() === req.user._id.toString()
      },
      posts: postsWithMeta
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get user'
    });
  }
});

// POST /api/users/:id/follow
router.post('/:id/follow', protect, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID'
      });
    }

    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot follow yourself'
      });
    }

    const userToFollow = await User.findById(req.params.id);
    if (!userToFollow) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const currentUser = await User.findById(req.user._id);

    if (currentUser.following.includes(userToFollow._id)) {
      return res.status(400).json({
        success: false,
        message: 'You are already following this user'
      });
    }

    currentUser.following.push(userToFollow._id);
    userToFollow.followers.push(currentUser._id);

    await currentUser.save();
    await userToFollow.save();

    res.json({
      success: true,
      message: `You are now following ${userToFollow.username}`,
      followersCount: userToFollow.followers.length,
      followingCount: currentUser.following.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to follow user'
    });
  }
});

// POST /api/users/:id/unfollow
router.post('/:id/unfollow', protect, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID'
      });
    }

    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot unfollow yourself'
      });
    }

    const userToUnfollow = await User.findById(req.params.id);
    if (!userToUnfollow) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const currentUser = await User.findById(req.user._id);

    if (!currentUser.following.includes(userToUnfollow._id)) {
      return res.status(400).json({
        success: false,
        message: 'You are not following this user'
      });
    }

    currentUser.following = currentUser.following.filter(
      (id) => id.toString() !== userToUnfollow._id.toString()
    );
    userToUnfollow.followers = userToUnfollow.followers.filter(
      (id) => id.toString() !== currentUser._id.toString()
    );

    await currentUser.save();
    await userToUnfollow.save();

    res.json({
      success: true,
      message: `You unfollowed ${userToUnfollow.username}`,
      followersCount: userToUnfollow.followers.length,
      followingCount: currentUser.following.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to unfollow user'
    });
  }
});

// GET /api/users/:id/followers
router.get('/:id/followers', protect, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID'
      });
    }

    const user = await User.findById(req.params.id).populate(
      'followers',
      'username profilePicture bio'
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      followers: user.followers,
      count: user.followers.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get followers'
    });
  }
});

// GET /api/users/:id/following
router.get('/:id/following', protect, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID'
      });
    }

    const user = await User.findById(req.params.id).populate(
      'following',
      'username profilePicture bio'
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      following: user.following,
      count: user.following.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get following'
    });
  }
});

module.exports = router;
