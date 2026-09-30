const express = require('express');
const Notification = require('../models/Notification');
const { protect } = require('../middleware/authMiddleware');
const { requireValidId } = require('../utils/ids');

const router = express.Router();
router.use(protect);

const populate = [
  { path: 'sender', select: 'name username avatar' },
  { path: 'project', select: 'name' },
  { path: 'task', select: 'title' }
];

router.get('/', async (req, res, next) => {
  try {
    const notifications = await Notification.find({ recipient: req.user._id })
      .populate(populate)
      .sort({ createdAt: -1 })
      .limit(80);

    const unreadCount = await Notification.countDocuments({
      recipient: req.user._id,
      read: false
    });

    res.json({ notifications, unreadCount });
  } catch (err) {
    next(err);
  }
});

router.put('/read-all', async (req, res, next) => {
  try {
    await Notification.updateMany({ recipient: req.user._id, read: false }, { $set: { read: true } });
    res.json({ message: 'All notifications marked as read.' });
  } catch (err) {
    next(err);
  }
});

router.put('/:id/read', requireValidId('id'), async (req, res, next) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      recipient: req.user._id
    });

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found.' });
    }

    notification.read = true;
    await notification.save();
    res.json({ notification });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
