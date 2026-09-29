const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key_super_secret_12345';

/**
 * Protect routes - requires valid JWT in Authorization header
 */
const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET);

      req.user = await User.findById(decoded.id).select('-password');

      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'User no longer exists'
        });
      }

      return next();
    } catch (error) {
      console.error('JWT verification error:', error.message);
      return res.status(401).json({
        success: false,
        message: 'Not authorized, invalid or expired token'
      });
    }
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized, no token provided'
    });
  }
};

/**
 * Optional Auth - extracts user if valid token present, otherwise continues as guest
 */
const optionalAuth = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = await User.findById(decoded.id).select('-password');
    } catch (error) {
      // Continue as guest
      req.user = null;
    }
  } else {
    req.user = null;
  }

  next();
};

module.exports = {
  protect,
  optionalAuth
};
