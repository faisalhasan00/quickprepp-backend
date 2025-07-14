const express = require('express');
const router = express.Router();

const {
  optimizeResumeHandler,
  parseJDHandler,
} = require('../controllers/jdController');

const limitDailyUsage = require('../middleware/limitDailyUsage');
const requireAuth = require('../middleware/authMiddleware');

// Protected routes with per-feature daily limits
router.post(
  '/resume/optimize',
  requireAuth,
  limitDailyUsage('resumeOptimize'), // 🔑 Pass feature key
  optimizeResumeHandler
);

router.post(
  '/jd/parse',
  requireAuth,
  limitDailyUsage('jdParse'), // 🔑 Separate key for different usage
  parseJDHandler
);

module.exports = router;
