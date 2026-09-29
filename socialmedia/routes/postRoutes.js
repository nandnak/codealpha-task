const express = require('express');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

const isValidObjectId = (id) => /^[0-9a-fA-F]{24}$/.test(id);

// GET /api/posts
router.get('/', protect, async (req, res) => {
  try {
    const posts = await Post.find()
      .populate('author', 'username profilePicture')
      .sort({ createdAt: -1 });

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
      posts: postsWithMeta,
      count: postsWithMeta.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to load posts'
    });
  }
});

// GET /api/posts/:id
router.get('/:id', protect, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid post ID'
      });
    }

    const post = await Post.findById(req.params.id).populate(
      'author',
      'username profilePicture'
    );

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    const commentCount = await Comment.countDocuments({ post: post._id });
    const likedByMe = post.likes.some(
      (id) => id.toString() === req.user._id.toString()
    );

    res.json({
      success: true,
      post: {
        ...post.toObject(),
        likeCount: post.likes.length,
        commentCount,
        likedByMe,
        isOwner: post.author._id.toString() === req.user._id.toString()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get post'
    });
  }
});

// POST /api/posts
router.post('/', protect, async (req, res) => {
  try {
    const { content, image } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Post content cannot be empty'
      });
    }

    if (content.trim().length > 2000) {
      return res.status(400).json({
        success: false,
        message: 'Post content cannot exceed 2000 characters'
      });
    }

    const post = await Post.create({
      author: req.user._id,
      content: content.trim(),
      image: image ? image.trim() : ''
    });

    await post.populate('author', 'username profilePicture');

    res.status(201).json({
      success: true,
      message: 'Post created successfully',
      post: {
        ...post.toObject(),
        likeCount: 0,
        commentCount: 0,
        likedByMe: false,
        isOwner: true
      }
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const message = Object.values(error.errors)
        .map((e) => e.message)
        .join(', ');
      return res.status(400).json({ success: false, message });
    }
    res.status(500).json({
      success: false,
      message: 'Failed to create post'
    });
  }
});

// PUT /api/posts/:id
router.put('/:id', protect, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid post ID'
      });
    }

    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    if (post.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only edit your own posts'
      });
    }

    const { content, image } = req.body;

    if (content !== undefined) {
      if (!content.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Post content cannot be empty'
        });
      }
      if (content.trim().length > 2000) {
        return res.status(400).json({
          success: false,
          message: 'Post content cannot exceed 2000 characters'
        });
      }
      post.content = content.trim();
    }

    if (image !== undefined) {
      post.image = image.trim();
    }

    await post.save();
    await post.populate('author', 'username profilePicture');

    const commentCount = await Comment.countDocuments({ post: post._id });
    const likedByMe = post.likes.some(
      (id) => id.toString() === req.user._id.toString()
    );

    res.json({
      success: true,
      message: 'Post updated successfully',
      post: {
        ...post.toObject(),
        likeCount: post.likes.length,
        commentCount,
        likedByMe,
        isOwner: true
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update post'
    });
  }
});

// DELETE /api/posts/:id
router.delete('/:id', protect, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid post ID'
      });
    }

    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    if (post.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own posts'
      });
    }

    await Comment.deleteMany({ post: post._id });
    await post.deleteOne();

    res.json({
      success: true,
      message: 'Post deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete post'
    });
  }
});

// POST /api/posts/:id/like
router.post('/:id/like', protect, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid post ID'
      });
    }

    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    if (post.likes.some((id) => id.toString() === req.user._id.toString())) {
      return res.status(400).json({
        success: false,
        message: 'You already liked this post'
      });
    }

    post.likes.push(req.user._id);
    await post.save();

    res.json({
      success: true,
      message: 'Post liked',
      likeCount: post.likes.length,
      likedByMe: true
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to like post'
    });
  }
});

// POST /api/posts/:id/unlike
router.post('/:id/unlike', protect, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid post ID'
      });
    }

    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    if (!post.likes.some((id) => id.toString() === req.user._id.toString())) {
      return res.status(400).json({
        success: false,
        message: 'You have not liked this post'
      });
    }

    post.likes = post.likes.filter(
      (id) => id.toString() !== req.user._id.toString()
    );
    await post.save();

    res.json({
      success: true,
      message: 'Post unliked',
      likeCount: post.likes.length,
      likedByMe: false
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to unlike post'
    });
  }
});

module.exports = router;
