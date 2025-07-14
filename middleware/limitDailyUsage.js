const dayjs = require('dayjs');
const User = require('../models/User');

const DAILY_LIMIT = 4;

/**
 * Middleware to restrict access to a feature based on daily usage.
 * @param {string} featureKey - The feature name (e.g., 'resumeBuilder', 'mockInterview')
 * @returns {Function}
 */
const limitDailyUsage = (featureKey) => {
  return async (req, res, next) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ message: 'Unauthorized: User not found' });
      }

      const today = dayjs().format('YYYY-MM-DD');

      // Initialize if missing
      if (!user.dailyUsage || typeof user.dailyUsage !== 'object') {
        user.dailyUsage = {};
      }

      // Feature-specific usage
      const usage = user.dailyUsage[featureKey];

      if (!usage || usage.date !== today) {
        // Reset today's count
        user.dailyUsage[featureKey] = { date: today, count: 1 };
      } else {
        if (usage.count >= DAILY_LIMIT) {
          return res.status(429).json({
            message: `Daily limit reached for ${featureKey} (${DAILY_LIMIT}/day). Try again tomorrow.`,
          });
        }
        user.dailyUsage[featureKey].count += 1;
      }

      await user.save();
      next();
    } catch (error) {
      console.error(`[limitDailyUsage] Failed to check usage:`, error);
      return res.status(500).json({ message: 'Internal server error in usage limiter.' });
    }
  };
};

module.exports = limitDailyUsage;
