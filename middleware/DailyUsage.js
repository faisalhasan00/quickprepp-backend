const mongoose = require('mongoose');

const dailyUsageSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User',
  },
  feature: {
    type: String,
    required: true,
    enum: ['resumeBuilder', 'mockInterview', 'roadmap', 'course'], // extend as needed
  },
  date: {
    type: String, // Format: 'YYYY-MM-DD'
    required: true,
  },
  count: {
    type: Number,
    required: true,
    default: 1,
  },
});

// Unique constraint to avoid duplicate entries
dailyUsageSchema.index({ userId: 1, feature: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('DailyUsage', dailyUsageSchema);
