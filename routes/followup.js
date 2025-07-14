const express = require('express');
const router = express.Router();
const { z } = require('zod');
const { generateFollowupQuestion } = require('../services/followUpService');

// Zod schema for input validation
const followupSchema = z.object({
  lastQuestion: z.string().min(5, 'lastQuestion must be at least 5 characters'),
  userAnswer: z.string().min(5, 'userAnswer must be at least 5 characters'),
});

// POST /api/followup
router.post('/', async (req, res) => {
  try {
    const parsed = followupSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: parsed.error.errors.map(err => err.message),
      });
    }

    const { lastQuestion, userAnswer } = parsed.data;

    const followUp = await generateFollowupQuestion(lastQuestion, userAnswer);

    if (!followUp || !followUp.question) {
      console.warn('⚠️ Follow-up question not generated properly');
      return res.status(500).json({ error: 'Could not generate follow-up question' });
    }

    res.json({ followUp: followUp.question });

  } catch (err) {
    console.error('❌ Error generating follow-up question:', err);
    res.status(500).json({ error: 'Server error while generating follow-up question' });
  }
});

module.exports = router;
