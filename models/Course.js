const mongoose = require('mongoose');

/* ---------- Video ---------- */
const videoSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Video title is required'],
      trim: true,
    },
    url: {
      type: String,
      required: [true, 'Video URL is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    freePreview: {
      type: Boolean,
      default: false, // 🎁 Free to watch if true
    },
    quiz: {
      questions: {
        type: Array,
        default: [],
      },
      triggerTime: {
        type: Number,
        default: 0,
      },
    },
  },
  {
    _id: false,
  }
);

/* ---------- Section ---------- */
const sectionSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Section title is required'],
      trim: true,
    },
    videos: {
      type: [videoSchema],
      default: [],
    },
  },
  {
    _id: false,
  }
);

/* ---------- Course ---------- */
const courseSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Course title is required'],
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    price: {
      type: Number,
      required: true,
      min: [0, 'Price must be >= 0'],
      default: 0,
    },
    isFree: {
      type: Boolean,
      default: false,
    },
    thumbnail: {
      type: String,
      default: '',
      trim: true,
    },
    enrolledUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    videoSections: {
      type: [sectionSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Course', courseSchema);
