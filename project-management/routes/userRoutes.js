const express = require('express');
const User = require('../models/User');
const { protect } = require('../middleware/authMiddleware');
const { requireValidId } = require('../utils/ids');

const router = express.Router();

router.use(protect);

router.get('/search', async (req, res, next) => {
  try {
    const q = (req.query.q || '').trim();
    if (!q) {
      return res.json({ users: [] });
    }

    const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const users = await User.find({
      $or: [{ username: regex }, { name: regex }, { email: regex }]
    })
      .select('name username email avatar bio createdAt')
      .limit(12);

    res.json({ users });
  } catch (err) {
    next(err);
  }
});

router.get('/', async (req, res, next) => {
  try {
    const users = await User.find()
      .select('name username avatar bio createdAt')
      .sort({ name: 1 })
      .limit(50);
    res.json({ users });
  } catch (err) {
    next(err);
  }
});

router.put('/profile', async (req, res, next) => {
  try {
    const { name, bio, avatar, currentPassword, newPassword } = req.body;
    const user = req.user;

    if (name !== undefined) {
      if (!String(name).trim()) {
        return res.status(400).json({ message: 'Name is required.' });
      }
      user.name = String(name).trim();
    }

    if (bio !== undefined) {
      user.bio = String(bio).slice(0, 300);
    }

    if (avatar !== undefined) {
      user.avatar = String(avatar).slice(0, 500);
    }

    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ message: 'Current password is required to set a new password.' });
      }
      if (newPassword.length < 6) {
        return res.status(400).json({ message: 'New password must be at least 6 characters.' });
      }
      const bcrypt = require('bcryptjs');
      const full = await require('../models/User').findById(user._id).select('+password');
      const ok = await bcrypt.compare(currentPassword, full.password);
      if (!ok) {
        return res.status(400).json({ message: 'Current password is incorrect.' });
      }
      user.password = await bcrypt.hash(newPassword, 10);
    }

    await user.save();
    res.json({
      user: {
        _id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        bio: user.bio,
        createdAt: user.createdAt
      }
    });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', requireValidId('id'), async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('name username avatar bio createdAt');
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }
    res.json({ user });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
