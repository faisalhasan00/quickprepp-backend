const mongoose = require('mongoose');

const purchaseSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // Used when user buys a pricing plan
    productId: {
      type: String,
      trim: true,
    },
    productName: {
      type: String,
      trim: true,
    },
    // Used when user purchases a course
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
    },
    amount: {
      type: Number,
      required: true,
      min: [1, 'Amount must be at least 1'],
    },
    razorpayOrderId: {
      type: String,
      required: true,
      trim: true,
    },
    razorpayPaymentId: {
      type: String,
      default: null,
      trim: true,
    },
    status: {
      type: String,
      enum: ['created', 'pending', 'paid', 'failed'],
      default: 'created',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Purchase', purchaseSchema);
