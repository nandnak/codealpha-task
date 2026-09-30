function notFound(req, res, next) {
  res.status(404).json({ message: 'Route not found.' });
}

function errorHandler(err, req, res, next) {
  console.error(err);

  if (err.name === 'ValidationError') {
    const first = Object.values(err.errors)[0];
    return res.status(400).json({ message: first ? first.message : 'Invalid data.' });
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || 'field';
    return res.status(400).json({ message: `That ${field} is already in use.` });
  }

  if (err.name === 'CastError') {
    return res.status(400).json({ message: 'Invalid ID.' });
  }

  const status = err.statusCode || 500;
  const message =
    status === 500 ? 'Something went wrong. Please try again.' : err.message || 'Request failed.';

  res.status(status).json({ message });
}

module.exports = { notFound, errorHandler };
