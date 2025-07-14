const express = require('express');
const {
  register,
  login,
  getMe,
  verifyOtp,
  resendOtp,
} = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// 📌 Public Routes
router.post('/register', register);           // Register a new user
router.post('/login', login);                 // Login with email or phone
router.post('/verify-otp', verifyOtp);        // Verify OTP during signup
router.post('/resend-otp', resendOtp);        // Resend OTP

// 🔐 Protected Route
router.get('/me', authMiddleware, getMe);     // Get logged-in user's profile

module.exports = router;
