const User = require('../models/User');

// Plan metadata (move to config if needed)
const PLAN_LIMITS = {
  mock_basic: { maxPerWeek: 3 },
  resume_mock: { maxPerWeek: 3 },
  crt_full: { maxPerWeek: Infinity },
};

const checkPlanLimits = async (req, res, next) => {
  try {
    const userId = req.userId;

    const user = await User.findById(userId);
    if (!user || !user.currentPlan || !user.currentPlan.productId) {
      return res.status(403).json({ message: 'No active plan found' });
    }

    const {
      productId,
      expiresAt,
      usageCount = 0,
      usageReset,
    } = user.currentPlan;

    const limit = PLAN_LIMITS[productId] || { maxPerWeek: 1 };
    const now = new Date();

    // Check plan expiry
    if (expiresAt && new Date(expiresAt) < now) {
      return res.status(403).json({ message: 'Your plan has expired' });
    }

    // Reset usage if 7 days passed since last reset
    const lastReset = usageReset ? new Date(usageReset) : null;
    const nextReset = lastReset ? new Date(lastReset.getTime() + 7 * 24 * 60 * 60 * 1000) : null;

    if (!lastReset || now >= nextReset) {
      user.currentPlan.usageCount = 0;
      user.currentPlan.usageReset = now;
    }

    // Block if limit exceeded
    if (user.currentPlan.usageCount >= limit.maxPerWeek) {
      return res.status(403).json({
        message: `Usage limit reached for this week. Max allowed: ${limit.maxPerWeek}`,
      });
    }

    // ✅ Allow access & increment usage
    user.currentPlan.usageCount += 1;
    await user.save();

    next();
  } catch (err) {
    console.error('❌ checkPlanLimits error:', err);
    res.status(500).json({ message: 'Plan limit check failed' });
  }
};

module.exports = checkPlanLimits;
