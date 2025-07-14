const express = require('express');
const router = express.Router();
const { generateStudyPlan } = require('../controllers/studyPlanController');
const requireAuth = require('../middleware/authMiddleware');
const limitDailyUsage = require('../middleware/limitDailyUsage');

// POST /api/study-plan/generate
router.post(
  '/generate',
  requireAuth,                      // 🔐 Enforce authentication
  limitDailyUsage('studyPlan'),    // 📊 Limit usage per day
  async (req, res, next) => {
    try {
      await generateStudyPlan(req, res);
    } catch (err) {
      console.error('❌ Error generating study plan:', err);
      next(err); // 🔄 Let global error handler catch it
    }
  }
);

module.exports = router;
