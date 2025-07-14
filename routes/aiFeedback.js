const express = require('express');
const { celebrate, Segments, Joi } = require('celebrate');
const rateLimit = require('express-rate-limit');

const { generateFeedback } = require('../services/aiFeedbackService');
const asyncHandler = require('../utils/asyncHandler');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * Lightweight hash so we can log a question fingerprint
 * without storing the full prompt.
 */
const hash = str =>
  require('crypto').createHash('sha1').update(str).digest('hex').slice(0, 8);

/* ------------------------------------------------------------------
   Per-IP rate-limit: 60 requests / 15 min  (tweak as needed)
-------------------------------------------------------------------*/
router.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

/* ------------------------------------------------------------------
   Validation middleware (celebrate + Joi)
-------------------------------------------------------------------*/
const feedbackSchema = {
  [Segments.BODY]: Joi.object({
    answer: Joi.string().min(5).max(5_000).trim().required(),
    question: Joi.string().min(5).max(500).trim().required(),
    jobRole: Joi.string().min(2).max(120).trim().required(),
  }),
};

router.post(
  '/',
  celebrate(feedbackSchema, { abortEarly: false }),
  asyncHandler(async (req, res) => {
    const { answer, question, jobRole } = req.body;

    logger.info(
      `[aiFeedback] role=${jobRole} qHash=${hash(question)} answerLen=${answer.length}`
    );

    const feedback = await generateFeedback({ answer, question, jobRole });
    if (!feedback) {
      // Bubble up to global error middleware
      throw new Error('generateFeedback returned empty response');
    }

    res.json(feedback);
  })
);

module.exports = router;
