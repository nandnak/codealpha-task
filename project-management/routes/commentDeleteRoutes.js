const express = require('express');
const Comment = require('../models/Comment');
const Task = require('../models/Task');
const { protect } = require('../middleware/authMiddleware');
const { requireValidId } = require('../utils/ids');
const { getMemberProject } = require('../utils/projectAccess');

const router = express.Router();
router.use(protect);

router.delete('/:id', requireValidId('id'), async (req, res, next) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found.' });
    }

    const task = await Task.findById(comment.task);
    if (!task) {
      return res.status(404).json({ message: 'Task not found.' });
    }

    const project = await getMemberProject(task.project, req.user._id);

    if (comment.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You can only delete your own comments.' });
    }

    await comment.deleteOne();
    task.comments = task.comments.filter((id) => id.toString() !== comment._id.toString());
    await task.save();

    req.app.get('io').to(`project_${project._id}`).emit('comment:deleted', {
      id: comment._id,
      taskId: task._id,
      projectId: project._id
    });

    res.json({ message: 'Comment deleted.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
