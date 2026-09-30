const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { isMember } = require('../utils/projectAccess');
const Project = require('../models/Project');

function setupSockets(io) {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth && socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication required.'));
      }
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('name username avatar');
      if (!user) {
        return next(new Error('User not found.'));
      }
      socket.user = user;
      next();
    } catch (err) {
      next(new Error('Invalid authentication token.'));
    }
  });

  io.on('connection', (socket) => {
    socket.join(`user_${socket.user._id}`);

    socket.on('joinProject', async (projectId) => {
      try {
        if (!projectId) return;
        const project = await Project.findById(projectId);
        if (!project || !isMember(project, socket.user._id)) return;
        socket.join(`project_${projectId}`);
      } catch (err) {
        console.error('joinProject error:', err.message);
      }
    });

    socket.on('leaveProject', (projectId) => {
      if (projectId) socket.leave(`project_${projectId}`);
    });

    socket.on('disconnect', () => {});
  });
}

module.exports = setupSockets;
