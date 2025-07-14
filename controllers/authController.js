// Backend/controllers/authController.js
const jwt = require('jsonwebtoken');
const Joi = require('joi');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const User = require('../models/User');
const { JWT_SECRET } = require('../config');

/* ------------------ Email Setup ------------------ */
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/* ------------------ Validation Schemas ------------------ */
const registerSchema = Joi.object({
  fullName: Joi.string().min(2).max(50).required(),
  email: Joi.string().email().required(),
  phone: Joi.string().pattern(/^[6-9]\d{9}$/).required(),
  city: Joi.string().max(60).optional().allow(''),
  college: Joi.string().max(120).optional().allow(''),
  course: Joi.string().max(120).optional().allow(''),
  referralCode: Joi.string().max(30).optional().allow(''),
  password: Joi.string().min(6).max(128).required(),
  confirmPassword: Joi.string()
    .valid(Joi.ref('password'))
    .required()
    .messages({ 'any.only': 'Passwords do not match' }),
  agreeTerms: Joi.boolean().valid(true).required()
    .messages({ 'any.only': 'You must agree to terms and privacy policy' }),
});

const loginSchema = Joi.object({
  credential: Joi.string().required(),
  password: Joi.string().required(),
});

/* ------------------ JWT Generator ------------------ */
const generateToken = (user) =>
  jwt.sign({ _id: user._id }, JWT_SECRET, { expiresIn: '7d' });

/* ------------------ Email OTP Sender ------------------ */
const sendOtpEmail = async (email, otp) => {
  const mailOptions = {
    from: `"Verify Your Email" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Your OTP Code',
    text: `Your OTP for verification is ${otp}. It expires in 5 minutes.`,
  };
  await transporter.sendMail(mailOptions);
};

/* ------------------ Register ------------------ */
exports.register = async (req, res) => {
  try {
    const { error, value } = registerSchema.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(400).json({ error: error.details.map((d) => d.message) });
    }

    const {
      fullName, email, phone, city, college, course,
      referralCode, password
    } = value;

    const existing = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { phone }],
    });

    if (existing) {
      return res.status(409).json({ error: 'Email or phone already registered' });
    }

    const otp = crypto.randomInt(100000, 999999).toString();
    const otpExpires = new Date(Date.now() + 5 * 60 * 1000);

    const user = await User.create({
      fullName,
      email: email.toLowerCase(),
      phone,
      city,
      college,
      course,
      referralCode,
      password,
      otp,
      otpExpires,
      isVerified: false,
    });

    try {
      await sendOtpEmail(user.email, otp);
    } catch (emailErr) {
      console.error('❌ Email sending failed:', emailErr);
      return res.status(500).json({ error: 'Failed to send OTP email' });
    }

    res.status(201).json({
      message: 'User registered. OTP sent to email.',
      userId: user._id,
    });
  } catch (err) {
    console.error('[Register Error]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/* ------------------ Verify OTP ------------------ */
exports.verifyOtp = async (req, res) => {
  const { userId, otp } = req.body;

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (user.isVerified) {
      return res.status(400).json({ error: 'User already verified' });
    }

    if (user.otp !== otp || user.otpExpires < Date.now()) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    user.isVerified = true;
    user.otp = null;
    user.otpExpires = null;
    await user.save();

    const token = generateToken(user);
    res.json({ message: 'OTP verified successfully', token });
  } catch (err) {
    console.error('[OTP Verify Error]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/* ------------------ Login ------------------ */
exports.login = async (req, res) => {
  try {
    console.log('🧪 Login attempt from:', { credential: req.body.credential });

    const { error, value } = loginSchema.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(400).json({ error: error.details.map((d) => d.message) });
    }

    const { credential, password } = value;

    const user = await User.findOne({
      $or: [{ email: credential.toLowerCase() }, { phone: credential }],
    }).select('+password');

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!user.isVerified) {
      return res.status(403).json({ error: 'Please verify your email before logging in.' });
    }

    const token = generateToken(user);

    res.json({
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        avatar: user.avatar,
      },
      token,
    });
  } catch (err) {
    console.error('[Login Error]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/* ------------------ Get Logged-in User ------------------ */
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    console.error('[GetMe Error]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/* ------------------ Resend OTP ------------------ */
exports.resendOtp = async (req, res) => {
  const { userId } = req.body;

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (user.isVerified) {
      return res.status(400).json({ error: 'User is already verified.' });
    }

    const otp = crypto.randomInt(100000, 999999).toString();
    user.otp = otp;
    user.otpExpires = new Date(Date.now() + 5 * 60 * 1000);
    await user.save();

    try {
      await sendOtpEmail(user.email, otp);
    } catch (emailErr) {
      console.error('❌ Email resend failed:', emailErr);
      return res.status(500).json({ error: 'Failed to resend OTP email' });
    }

    res.json({ message: 'OTP resent successfully. Please check your email.' });
  } catch (err) {
    console.error('[Resend OTP Error]', err);
    res.status(500).json({ error: 'Failed to resend OTP' });
  }
};
