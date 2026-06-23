const errorHandler = (err, req, res, _next) => {
  if (err && err.name === 'ValidationError') {
    const first = Object.values(err.errors)[0];
    return res.status(400).json({
      message: first ? first.message : 'Invalid request',
    });
  }

  if (err && err.code === 11000) {
    return res.status(409).json({
      message: 'An account with that email already exists',
    });
  }

  if (err && (err.status || err.statusCode)) {
    return res.status(err.status || err.statusCode).json({
      message: err.message || 'Request failed',
    });
  }

  console.error('Unhandled error:', err);
  return res.status(500).json({ message: 'Something went wrong on our end' });
};

module.exports = errorHandler;
