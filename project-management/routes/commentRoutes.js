const express = require('express');
const Comment = require('../models/Comment');
const Task = require('../models/Task');
const User = require('../models/User');
const { protect } = require('../middleware/authMiddleware');
const { requireValidId } = require('../utils/ids');
const { getMemberProject } = require('../utils/projectAccess');
const { createNotification } = require('../utils/notify');

const router = express.Router();
router.use(protect);

const authorSelect = 'name username avatar';

router.get('/:taskId/comments', requireValidId('taskId'), async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found.' });
    }
    await getMemberProject(task.project, req.user._id);

    const comments = await Comment.find({ task: task._id })
      .populate('author', authorSelect)
      .sort({ createdAt: 1 });

    res.json({ comments });
  } catch (err) {
    next(err);
  }
});

router.post('/:taskId/comments', requireValidId('taskId'), async (req, res, next) => {
  try {
    const content = req.body.content ? String(req.body.content).trim() : '';
    if (!content) {
      return res.status(400).json({ message: 'Comment cannot be empty.' });
    }

    const task = await Task.findById(req.params.taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found.' });
    }
    const project = await getMemberProject(task.project, req.user._id);

    const comment = await Comment.create({
      task: task._id,
      author: req.user._id,
      content
    });

    task.comments.push(comment._id);
    await task.save();

    const populated = await Comment.findById(comment._id).populate('author', authorSelect);
    const io = req.app.get('io');
    io.to(`project_${project._id}`).emit('comment:created', {
      comment: populated,
      taskId: task._id,
      projectId: project._id
    });

    if (task.assignedTo && task.assignedTo.toString() !== req.user._id.toString()) {
      await createNotification(io, {
        recipient: task.assignedTo,
        sender: req.user._id,
        type: 'task_comment',
        message: `${req.user.name} commented on "${task.title}".`,
        project: project._id,
        task: task._id
      });
    }

    const mentions = content.match(/@([a-zA-Z0-9_]+)/g) || [];
    const usernames = [...new Set(mentions.map((m) => m.slice(1).toLowerCase()))];
    if (usernames.length) {
      const users = await User.find({ username: { $in: usernames } });
      await Promise.all(
        users.map((u) =>
          createNotification(io, {
            recipient: u._id,
            sender: req.user._id,
            type: 'mention',
            message: `${req.user.name} mentioned you in a comment on "${task.title}".`,
            project: project._id,
            task: task._id
          })
        )
      );
    }

    res.status(201).json({ comment: populated });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
