const express = require('express');
const Task = require('../models/Task');
const Comment = require('../models/Comment');
const { protect } = require('../middleware/authMiddleware');
const { requireValidId, isValidId } = require('../utils/ids');
const { getMemberProject } = require('../utils/projectAccess');
const { createNotification } = require('../utils/notify');

const router = express.Router();
router.use(protect);

const memberSelect = 'name username email avatar bio';

async function withCommentCount(task) {
  const count = await Comment.countDocuments({ task: task._id });
  return { ...task.toObject(), commentCount: count };
}

router.get('/mine', async (req, res, next) => {
  try {
    const tasks = await Task.find({ assignedTo: req.user._id })
      .populate('project', 'name')
      .populate('assignedTo', memberSelect)
      .populate('createdBy', 'name username avatar')
      .sort({ dueDate: 1, updatedAt: -1 });

    res.json({ tasks });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', requireValidId('id'), async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('assignedTo', memberSelect)
      .populate('createdBy', 'name username avatar')
      .populate('project', 'name owner members');

    if (!task) {
      return res.status(404).json({ message: 'Task not found.' });
    }

    await getMemberProject(task.project._id, req.user._id);
    res.json({ task: await withCommentCount(task) });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', requireValidId('id'), async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found.' });
    }

    const project = await getMemberProject(task.project, req.user._id);
    const previousAssignee = task.assignedTo ? task.assignedTo.toString() : null;
    const previousStatus = task.status;

    const { title, description, assignedTo, status, priority, dueDate } = req.body;

    if (title !== undefined) {
      if (!String(title).trim()) {
        return res.status(400).json({ message: 'Task title is required.' });
      }
      task.title = String(title).trim();
    }

    if (description !== undefined) {
      task.description = String(description).trim();
    }

    if (assignedTo !== undefined) {
      if (assignedTo === null || assignedTo === '') {
        task.assignedTo = null;
      } else {
        if (!isValidId(assignedTo)) {
          return res.status(400).json({ message: 'Invalid assignee.' });
        }
        if (!project.members.some((m) => m.toString() === assignedTo)) {
          return res.status(400).json({ message: 'Assignee must be a project member.' });
        }
        task.assignedTo = assignedTo;
      }
    }

    if (status !== undefined) {
      if (!Task.STATUSES.includes(status)) {
        return res.status(400).json({ message: 'Invalid status.' });
      }
      task.status = status;
    }

    if (priority !== undefined) {
      if (!Task.PRIORITIES.includes(priority)) {
        return res.status(400).json({ message: 'Invalid priority.' });
      }
      task.priority = priority;
    }

    if (dueDate !== undefined) {
      task.dueDate = dueDate || null;
    }

    await task.save();

    const populated = await Task.findById(task._id)
      .populate('assignedTo', memberSelect)
      .populate('createdBy', 'name username avatar');

    const payload = await withCommentCount(populated);
    const io = req.app.get('io');
    io.to(`project_${project._id}`).emit('task:updated', payload);

    const newAssignee = task.assignedTo ? task.assignedTo.toString() : null;
    if (newAssignee && newAssignee !== previousAssignee) {
      await createNotification(io, {
        recipient: newAssignee,
        sender: req.user._id,
        type: previousAssignee ? 'task_reassigned' : 'task_assigned',
        message: previousAssignee
          ? `${req.user.name} reassigned "${task.title}" to you in ${project.name}.`
          : `${req.user.name} assigned you to "${task.title}" in ${project.name}.`,
        project: project._id,
        task: task._id
      });
    }

    if (status && status !== previousStatus && newAssignee) {
      await createNotification(io, {
        recipient: newAssignee,
        sender: req.user._id,
        type: 'task_status',
        message: `${req.user.name} moved "${task.title}" to ${status.replace('-', ' ')}.`,
        project: project._id,
        task: task._id
      });
    }

    res.json({ task: payload });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', requireValidId('id'), async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found.' });
    }

    const project = await getMemberProject(task.project, req.user._id);
    await Comment.deleteMany({ task: task._id });
    await task.deleteOne();

    req.app.get('io').to(`project_${project._id}`).emit('task:deleted', { id: task._id, projectId: project._id });
    res.json({ message: 'Task deleted.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
