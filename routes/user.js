const express = require('express');
const auth = require('../middleware/auth');
const User = require('../models/User');

const router = express.Router();

// 📊 Get Current Plan Status
router.get('/plan-status', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);

    if (!user || !user.currentPlan || !user.currentPlan.productId) {
      return res.status(404).json({ message: 'No active plan found' });
    }

    const plan = user.currentPlan;

    const now = new Date();
    const expiresInDays = Math.ceil(
      (new Date(plan.expiresAt) - now) / (1000 * 60 * 60 * 24)
    );

    return res.status(200).json({
      planName: plan.productName,
      productId: plan.productId,
      usageCount: plan.usageCount || 0,
      usageReset: plan.usageReset,
      expiresAt: plan.expiresAt,
      purchasedAt: plan.purchasedAt,
      expiresInDays,
    });
  } catch (err) {
    console.error('❌ Plan Status Error:', err.message);
    return res.status(500).json({ message: 'Could not fetch plan status' });
  }
});

module.exports = router;
