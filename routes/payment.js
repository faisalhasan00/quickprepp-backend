// routes/payment.js
const express = require('express');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const Purchase = require('../models/Purchase');
const Course = require('../models/Course');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

const {
  RAZORPAY_KEY_ID,
  RAZORPAY_KEY_SECRET,
  RAZORPAY_WEBHOOK_SECRET,
  NODE_ENV,
} = process.env;

// ⚠️ Safety check
if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
  throw new Error('❌ Missing Razorpay credentials in .env');
}

if (NODE_ENV === 'production' && RAZORPAY_KEY_ID.includes('rzp_test')) {
  throw new Error('❌ Test Razorpay keys being used in production!');
}

const razorpay = new Razorpay({
  key_id: RAZORPAY_KEY_ID,
  key_secret: RAZORPAY_KEY_SECRET,
});

// 🎯 Plan metadata
const planMetadata = {
  mock_basic: { durationDays: 7, maxMocksPerWeek: 3 },
  resume_mock: { durationDays: 7, maxMocksPerWeek: 3 },
  crt_full: { durationDays: 90, maxMocksPerWeek: Infinity },
};

/**
 * 1️⃣ Create Razorpay Order
 */
router.post('/create-order', auth, async (req, res) => {
  try {
    const { amount, productId, productName, courseId } = req.body;

    if (!amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({ message: 'Invalid or missing amount' });
    }

    if (!productId && !courseId) {
      return res
        .status(400)
        .json({ message: 'productId or courseId is required' });
    }

    const notes = {
      userId: req.userId,
      courseId: courseId || '',
      productId: productId || '',
    };

    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100), // INR -> paise
      currency: 'INR',
      receipt: `rcpt_${Date.now()}`,
      payment_capture: 1,
      notes,
    });

    // Pre-save plan purchase record
    if (productId && productName) {
      await Purchase.create({
        userId: req.userId,
        productId,
        productName,
        amount,
        razorpayOrderId: order.id,
        status: 'created',
      });
    }

    return res.status(200).json({
      orderId: order.id,
      key: RAZORPAY_KEY_ID,
      amount: order.amount,
    });
  } catch (err) {
    console.error('❌ Razorpay Order Error:', err.message);
    return res.status(500).json({
      message: 'Could not create Razorpay order',
      error: err.message,
    });
  }
});

/**
 * 2️⃣ Verify Razorpay Payment & Activate Plan / Course
 */
router.post('/verify', auth, async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      courseId,
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res
        .status(400)
        .json({ message: 'Missing required Razorpay verification fields' });
    }

    // ✅ Verify Signature
    const hmac = crypto.createHmac('sha256', RAZORPAY_KEY_SECRET);
    hmac.update(`${razorpay_order_id}|${razorpay_payment_id}`);
    const expectedSignature = hmac.digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ message: 'Invalid Razorpay signature' });
    }

    // ✅ If course, enroll
    if (courseId) {
      const course = await Course.findByIdAndUpdate(
        courseId,
        { $addToSet: { enrolledUsers: req.userId } },
        { new: true }
      );

      if (!course) {
        return res.status(404).json({ message: 'Course not found' });
      }

      return res.status(200).json({
        success: true,
        message: 'Course enrolled successfully',
        courseId: course._id,
      });
    }

    // ✅ If plan, update Purchase & assign plan
    const purchase = await Purchase.findOneAndUpdate(
      { razorpayOrderId: razorpay_order_id },
      {
        razorpayPaymentId: razorpay_payment_id,
        status: 'paid',
        verifiedAt: new Date(),
      },
      { new: true }
    );

    if (!purchase) {
      return res.status(404).json({ message: 'Purchase record not found' });
    }

    if (purchase.status === 'paid') {
      return res.status(400).json({ message: 'Payment already verified' });
    }

    const meta = planMetadata[purchase.productId] || {
      durationDays: 30,
      maxMocksPerWeek: 1,
    };

    await User.findByIdAndUpdate(req.userId, {
      currentPlan: {
        productId: purchase.productId,
        productName: purchase.productName,
        purchasedAt: new Date(),
        expiresAt: new Date(Date.now() + meta.durationDays * 24 * 60 * 60 * 1000),
        usageCount: 0,
        usageReset: new Date(),
      },
    });

    return res.status(200).json({
      success: true,
      message: 'Payment verified and plan activated',
    });
  } catch (err) {
    console.error('❌ Payment Verification Error:', err);
    return res.status(500).json({
      message: 'Payment verification failed',
      error: err.message,
    });
  }
});

/**
 * 3️⃣ Razorpay Webhook Handler (optional for future)
 */
router.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  (req, res) => {
    try {
      const signature = req.headers['x-razorpay-signature'];
      const expected = crypto
        .createHmac('sha256', RAZORPAY_WEBHOOK_SECRET)
        .update(req.rawBody)
        .digest('hex');

      if (signature === expected) {
        console.log('✅ Razorpay Webhook Verified');
        return res.status(200).send('OK');
      } else {
        console.warn('⚠️ Invalid webhook signature');
        return res.status(400).send('Invalid signature');
      }
    } catch (err) {
      console.error('❌ Webhook Error:', err.message);
      return res.status(500).send('Webhook processing failed');
    }
  }
);

/**
 * 4️⃣ Get Paid Purchases for User
 */
router.get('/purchases', auth, async (req, res) => {
  try {
    const purchases = await Purchase.find({
      userId: req.userId,
      status: 'paid',
    }).sort({ createdAt: -1 });

    return res.status(200).json({ purchases });
  } catch (err) {
    console.error('❌ Error fetching purchases:', err);
    return res.status(500).json({ message: 'Could not fetch purchases' });
  }
});

module.exports = router;
