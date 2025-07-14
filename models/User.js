// File: Backend/models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 50,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: /^\S+@\S+\.\S+$/,
    },
    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      match: /^[6-9]\d{9}$/, // Indian mobile number format
    },
    city: { type: String, trim: true },
    college: { type: String, trim: true },
    course: { type: String, trim: true },
    referralCode: { type: String, trim: true },

    password: {
      type: String,
      required: true,
      minlength: 6,
      select: false,
    },

    // 🔐 OTP & Email Verification
    otp: { type: String },
    otpExpires: { type: Date },
    isVerified: { type: Boolean, default: false },

    // ✅ New: Daily usage limiter
    dailyUsage: {
      date: { type: String },  // e.g., "2025-07-13"
      count: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

// 🔐 Hash password before save
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// 🔐 Compare candidate password with hash
userSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

// 🔐 Clean up JSON output
userSchema.set('toJSON', {
  transform: (_, ret) => {
    delete ret.password;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model('User', userSchema);
