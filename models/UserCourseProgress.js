// models/UserCourseProgress.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const progressSchema = new Schema({
  videoId: {
    type: Schema.Types.ObjectId,
    ref: 'Course.videos', // optional, not needed unless populated
    required: true,
  },
  watchedDuration: {
    type: Number,
    default: 0, // in seconds
  },
  isCompleted: {
    type: Boolean,
    default: false,
  },
});

const userCourseProgressSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    courseId: {
      type: Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
    },
    progress: [progressSchema],
    lastWatchedVideoId: {
      type: Schema.Types.ObjectId,
      ref: 'Course.videos',
    },
    completedPercentage: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('UserCourseProgress', userCourseProgressSchema);
