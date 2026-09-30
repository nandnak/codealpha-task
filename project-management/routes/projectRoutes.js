const express = require('express');
const Project = require('../models/Project');
const Task = require('../models/Task');
const Comment = require('../models/Comment');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { protect } = require('../middleware/authMiddleware');
const { requireValidId, isValidId } = require('../utils/ids');
const { isOwner, getMemberProject } = require('../utils/projectAccess');
const { createNotification } = require('../utils/notify');

const router = express.Router();
router.use(protect);

const memberSelect = 'name username email avatar bio';

async function populateProject(project) {
  return Project.findById(project._id)
    .populate('owner', memberSelect)
    .populate('members', memberSelect);
}

router.get('/', async (req, res, next) => {
  try {
    const projects = await Project.find({ members: req.user._id })
      .populate('owner', memberSelect)
      .populate('members', memberSelect)
      .sort({ updatedAt: -1 });

    const withCounts = await Promise.all(
      projects.map(async (project) => {
        const tasks = await Task.find({ project: project._id }).select('status dueDate');
        const obj = project.toObject();
        obj.taskCount = tasks.length;
        obj.completedCount = tasks.filter((t) => t.status === 'completed').length;
        return obj;
      })
    );

    res.json({ projects: withCounts });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { name, description } = req.body;
    if (!name || !String(name).trim()) {
      return res.status(400).json({ message: 'Project name is required.' });
    }

    const project = await Project.create({
      name: String(name).trim(),
      description: description ? String(description).trim() : '',
      owner: req.user._id,
      members: [req.user._id]
    });

    const populated = await populateProject(project);
    res.status(201).json({ project: populated });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', requireValidId('id'), async (req, res, next) => {
  try {
    const project = await getMemberProject(req.params.id, req.user._id);
    const populated = await populateProject(project);
    const tasks = await Task.find({ project: project._id }).select('status dueDate title');

    const summary = {
      todo: 0,
      'in-progress': 0,
      review: 0,
      completed: 0
    };
    tasks.forEach((t) => {
      if (summary[t.status] !== undefined) summary[t.status] += 1;
    });

    const upcoming = tasks
      .filter((t) => t.dueDate && t.status !== 'completed')
      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
      .slice(0, 6);

    res.json({
      project: populated,
      stats: {
        members: populated.members.length,
        tasks: tasks.length,
        completed: summary.completed,
        pending: tasks.length - summary.completed,
        inProgress: summary['in-progress'],
        summary,
        upcoming
      }
    });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', requireValidId('id'), async (req, res, next) => {
  try {
    const project = await getMemberProject(req.params.id, req.user._id);
    if (!isOwner(project, req.user._id)) {
      return res.status(403).json({ message: 'Only the project owner can edit this project.' });
    }

    const { name, description } = req.body;
    if (name !== undefined) {
      if (!String(name).trim()) {
        return res.status(400).json({ message: 'Project name is required.' });
      }
      project.name = String(name).trim();
    }
    if (description !== undefined) {
      project.description = String(description).trim();
    }

    await project.save();
    const populated = await populateProject(project);
    req.app.get('io').to(`project_${project._id}`).emit('project:updated', populated);
    res.json({ project: populated });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', requireValidId('id'), async (req, res, next) => {
  try {
    const project = await getMemberProject(req.params.id, req.user._id);
    if (!isOwner(project, req.user._id)) {
      return res.status(403).json({ message: 'Only the project owner can delete this project.' });
    }

    const tasks = await Task.find({ project: project._id }).select('_id');
    const taskIds = tasks.map((t) => t._id);
    await Comment.deleteMany({ task: { $in: taskIds } });
    await Task.deleteMany({ project: project._id });
    await Notification.deleteMany({ project: project._id });
    await project.deleteOne();

    req.app.get('io').to(`project_${project._id}`).emit('project:deleted', { id: project._id });
    res.json({ message: 'Project deleted.' });
  } catch (err) {
    next(err);
  }
});

router.get('/:id/tasks', requireValidId('id'), async (req, res, next) => {
  try {
    await getMemberProject(req.params.id, req.user._id);
    const tasks = await Task.find({ project: req.params.id })
      .populate('assignedTo', memberSelect)
      .populate('createdBy', 'name username avatar')
      .sort({ updatedAt: -1 });

    const counts = await Comment.aggregate([
      { $match: { task: { $in: tasks.map((t) => t._id) } } },
      { $group: { _id: '$task', count: { $sum: 1 } } }
    ]);
    const countMap = {};
    counts.forEach((c) => {
      countMap[c._id.toString()] = c.count;
    });

    res.json({
      tasks: tasks.map((t) => {
        const obj = t.toObject();
        obj.commentCount = countMap[t._id.toString()] || 0;
        return obj;
      })
    });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/tasks', requireValidId('id'), async (req, res, next) => {
  try {
    const project = await getMemberProject(req.params.id, req.user._id);
    const { title, description, assignedTo, status, priority, dueDate } = req.body;

    if (!title || !String(title).trim()) {
      return res.status(400).json({ message: 'Task title is required.' });
    }

    if (assignedTo && !isValidId(assignedTo)) {
      return res.status(400).json({ message: 'Invalid assignee.' });
    }

    if (assignedTo && !project.members.some((m) => m.toString() === assignedTo)) {
      return res.status(400).json({ message: 'Assignee must be a project member.' });
    }

    const task = await Task.create({
      title: String(title).trim(),
      description: description ? String(description).trim() : '',
      project: project._id,
      assignedTo: assignedTo || null,
      createdBy: req.user._id,
      status: Task.STATUSES.includes(status) ? status : 'todo',
      priority: Task.PRIORITIES.includes(priority) ? priority : 'medium',
      dueDate: dueDate || null
    });

    const populated = await Task.findById(task._id)
      .populate('assignedTo', memberSelect)
      .populate('createdBy', 'name username avatar');

    const io = req.app.get('io');
    io.to(`project_${project._id}`).emit('task:created', { ...populated.toObject(), commentCount: 0 });

    if (assignedTo) {
      await createNotification(io, {
        recipient: assignedTo,
        sender: req.user._id,
        type: 'task_assigned',
        message: `${req.user.name} assigned you to "${populated.title}" in ${project.name}.`,
        project: project._id,
        task: populated._id
      });
    }

    res.status(201).json({ task: { ...populated.toObject(), commentCount: 0 } });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/members', requireValidId('id'), async (req, res, next) => {
  try {
    const project = await getMemberProject(req.params.id, req.user._id);
    if (!isOwner(project, req.user._id)) {
      return res.status(403).json({ message: 'Only the project owner can add members.' });
    }

    const { userId } = req.body;
    if (!userId || !isValidId(userId)) {
      return res.status(400).json({ message: 'A valid user is required.' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    if (project.members.some((m) => m.toString() === userId)) {
      return res.status(400).json({ message: 'That user is already a project member.' });
    }

    project.members.push(user._id);
    await project.save();

    const populated = await populateProject(project);
    const io = req.app.get('io');
    io.to(`project_${project._id}`).emit('project:members', populated);

    await createNotification(io, {
      recipient: user._id,
      sender: req.user._id,
      type: 'project_added',
      message: `${req.user.name} added you to the project "${project.name}".`,
      project: project._id
    });

    res.json({ project: populated });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id/members/:userId', requireValidId('id'), requireValidId('userId'), async (req, res, next) => {
  try {
    const project = await getMemberProject(req.params.id, req.user._id);
    const targetId = req.params.userId;

    if (targetId === project.owner.toString()) {
      return res.status(400).json({ message: 'The project owner cannot be removed.' });
    }

    const isSelf = targetId === req.user._id.toString();
    if (!isOwner(project, req.user._id) && !isSelf) {
      return res.status(403).json({ message: 'You cannot remove this member.' });
    }

    if (!project.members.some((m) => m.toString() === targetId)) {
      return res.status(400).json({ message: 'That user is not a member of this project.' });
    }

    project.members = project.members.filter((m) => m.toString() !== targetId);
    await project.save();

    await Task.updateMany(
      { project: project._id, assignedTo: targetId },
      { $set: { assignedTo: null } }
    );

    const populated = await populateProject(project);
    const io = req.app.get('io');
    io.to(`project_${project._id}`).emit('project:members', populated);

    if (!isSelf) {
      await createNotification(io, {
        recipient: targetId,
        sender: req.user._id,
        type: 'project_removed',
        message: `${req.user.name} removed you from the project "${project.name}".`,
        project: project._id
      });
    }

    res.json({ project: populated });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
