const Notification = require('../models/Notification');

const populate = [
  { path: 'sender', select: 'name username avatar' },
  { path: 'project', select: 'name' },
  { path: 'task', select: 'title' }
];

async function createNotification(io, data) {
  try {
    const recipientId = data.recipient && data.recipient.toString();
    const senderId = data.sender && data.sender.toString();
    if (!recipientId || recipientId === senderId) return null;

    const notification = await Notification.create(data);
    const populated = await Notification.findById(notification._id).populate(populate);

    if (io) {
      io.to(`user_${recipientId}`).emit('notification:new', populated);
    }

    return populated;
  } catch (err) {
    console.error('Notification error:', err.message);
    return null;
  }
}

async function notifyMany(io, recipientIds, data) {
  const unique = [...new Set(recipientIds.map((id) => id && id.toString()).filter(Boolean))];
  await Promise.all(unique.map((recipient) => createNotification(io, { ...data, recipient })));
}

module.exports = { createNotification, notifyMany };
