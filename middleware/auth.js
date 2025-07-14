/* ─────────────────────────────────────────────────────────────
   middleware/auth.js – Unified JWT Authentication Middleware
   ───────────────────────────────────────────────────────────── */

const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * 🔐 JWT Authentication Middleware
 *
 * ✅ Expects: Authorization: Bearer <token>
 * ✅ Attaches to req:
 *    - req.user   → full user document (password excluded)
 *    - req.userId → user ID as string
 */
module.exports = async (req, res, next) => {
  try {
    // 1️⃣ Check Authorization Header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Access token missing or malformed' });
    }

    const token = authHeader.split(' ')[1];

    // 2️⃣ Decode & Verify JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId || decoded.id || decoded._id;

    if (!userId) {
      return res.status(403).json({ message: 'Invalid token payload' });
    }

    // 3️⃣ Lookup User
    const user = await User.findById(userId).select('-password');
    if (!user) {
      return res.status(401).json({ message: 'User not found for provided token' });
    }

    // 4️⃣ Attach Auth Info to Request
    req.user = user;
    req.userId = user._id.toString();

    next();
  } catch (err) {
    console.error('❌ Auth Error:', err.message);

    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token has expired. Please login again.' });
    }

    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token. Please login again.' });
    }

    return res.status(500).json({ message: 'Server error during authentication.' });
  }
};
