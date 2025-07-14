// Backend/middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config');
const User = require('../models/User');

/**
 * Middleware to authenticate requests using Bearer token (JWT).
 * Loads full user document and attaches it to `req.user`.
 */
module.exports = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || '';

    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized: Malformed token' });
    }

    // Decode token
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded?._id; // ✅ updated to match new payload

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized: Invalid token payload' });
    }

    // Load full user from DB
    const user = await User.findById(userId);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized: User not found' });
    }

    req.user = user; // Attach full user document to request
    next();
  } catch (err) {
    console.error('❌ JWT verification failed:', err.message);
    return res.status(401).json({
      error:
        err.name === 'TokenExpiredError'
          ? 'Session expired. Please login again.'
          : 'Unauthorized: Invalid token',
    });
  }
};
