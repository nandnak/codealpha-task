const mongoose = require('mongoose');

function isValidId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

function requireValidId(paramName) {
  return (req, res, next) => {
    const id = req.params[paramName];
    if (!isValidId(id)) {
      return res.status(400).json({ message: 'Invalid ID.' });
    }
    next();
  };
}

module.exports = { isValidId, requireValidId };
