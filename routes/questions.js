const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { z } = require('zod');

const { generateMainQuestions } = require('../services/openaiService');
const requireAuth = require('../middleware/authMiddleware');
const limitDailyUsage = require('../middleware/limitDailyUsage');

// ---------------------- Rate Limiter (Anti-spam) ----------------------
const generateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10,
  message: { success: false, error: 'Too many requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ---------------------- Zod Schema ----------------------
const questionSchema = z.object({
  mockType: z.string().min(1, 'Mock type is required'),
  roleOrSubject: z.string().min(1, 'Role or subject is required'),
  subjectsOrTopics: z.array(z.string()).min(1, 'At least one subject/topic is required'),
  companies: z.array(z.string()).optional(),
  duration: z.number().min(1, 'Duration must be at least 1 minute'),
});

// ---------------------- Utility: Error Response ----------------------
const sendError = (res, code, message, details = []) => {
  return res.status(code).json({
    success: false,
    error: message,
    ...(details.length > 0 && { details }),
  });
};

// ---------------------- POST /api/questions/main ----------------------
router.post(
  '/main',
  requireAuth,                     // 🔐 Authenticate user
  limitDailyUsage('mockInterview'), // 📊 Limit daily usage
  generateLimiter,                // ⏱️ Basic rate limit to prevent abuse
  async (req, res) => {
    try {
      const parsed = questionSchema.safeParse(req.body);
      if (!parsed.success) {
        const errorDetails = parsed.error.errors.map(e => ({
          path: e.path.join('.'),
          message: e.message,
        }));
        return sendError(res, 400, 'Validation failed', errorDetails);
      }

      const {
        mockType,
        roleOrSubject,
        subjectsOrTopics,
        companies = [],
        duration,
      } = parsed.data;

      console.log(
        `[🧠 QuestionGen] Type: ${mockType}, Role/Subject: ${roleOrSubject}, Topics: ${subjectsOrTopics.join(', ')}, Duration: ${duration} min`
      );

      const result = await generateMainQuestions(
        mockType,
        roleOrSubject,
        subjectsOrTopics,
        companies,
        duration
      );

      const questions = result?.questions;

      if (!Array.isArray(questions) || questions.length === 0) {
        return sendError(res, 500, 'Failed to generate questions. Please try again.');
      }

      return res.status(200).json({
        success: true,
        questions,
      });
    } catch (err) {
      console.error('❌ Internal Server Error:', err);
      return sendError(res, 500, 'Internal server error. Please try again later.');
    }
  }
);

module.exports = router;
