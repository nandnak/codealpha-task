const Project = require('../models/Project');

function isMember(project, userId) {
  const id = userId.toString();
  if (project.owner.toString() === id) return true;
  return project.members.some((member) => member.toString() === id);
}

function isOwner(project, userId) {
  return project.owner.toString() === userId.toString();
}

async function getMemberProject(projectId, userId) {
  const project = await Project.findById(projectId);
  if (!project) {
    const err = new Error('Project not found.');
    err.statusCode = 404;
    throw err;
  }
  if (!isMember(project, userId)) {
    const err = new Error('You do not have access to this project.');
    err.statusCode = 403;
    throw err;
  }
  return project;
}

module.exports = { isMember, isOwner, getMemberProject };
