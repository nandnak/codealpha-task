const express = require('express');
const Comment = require('../models/Comment');
const Post = require('../models/Post');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

const isValidObjectId = (id) => /^[0-9a-fA-F]{24}$/.test(id);

// GET /api/posts/:id/comments
router.get('/posts/:id/comments', protect, async (req, res) => {
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

    const comments = await Comment.find({ post: req.params.id })
      .populate('author', 'username profilePicture')
      .sort({ createdAt: 1 });

    const commentsWithMeta = comments.map((comment) => ({
      ...comment.toObject(),
      isOwner: comment.author._id.toString() === req.user._id.toString()
    }));

    res.json({
      success: true,
      comments: commentsWithMeta,
      count: commentsWithMeta.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to load comments'
    });
  }
});

// POST /api/posts/:id/comments
router.post('/posts/:id/comments', protect, async (req, res) => {
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

    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Comment cannot be empty'
      });
    }

    if (content.trim().length > 500) {
      return res.status(400).json({
        success: false,
        message: 'Comment cannot exceed 500 characters'
      });
    }

    const comment = await Comment.create({
      post: req.params.id,
      author: req.user._id,
      content: content.trim()
    });

    await comment.populate('author', 'username profilePicture');

    res.status(201).json({
      success: true,
      message: 'Comment added',
      comment: {
        ...comment.toObject(),
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
      message: 'Failed to add comment'
    });
  }
});

// DELETE /api/comments/:id
router.delete('/comments/:id', protect, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid comment ID'
      });
    }

    const comment = await Comment.findById(req.params.id);
    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }

    if (comment.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own comments'
      });
    }

    await comment.deleteOne();

    res.json({
      success: true,
      message: 'Comment deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete comment'
    });
  }
});

module.exports = router;
