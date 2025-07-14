const { generatePlanFromAI } = require('../services/aiRoadmapService');
const Joi = require('joi');

// ------------------ Validation Schema ------------------
const studyPlanSchema = Joi.object({
  goal: Joi.string().min(3).required(),
  hoursPerDay: Joi.number().min(1).max(24).required(),
  daysPerWeek: Joi.number().min(1).max(7).required(),
  skillLevel: Joi.string().valid('beginner', 'intermediate', 'advanced').required(),
  totalDurationWeeks: Joi.number().min(1).max(52).required(),
});

// ------------------ Controller ------------------
exports.generateStudyPlan = async (req, res) => {
  const { error, value } = studyPlanSchema.validate(req.body, { abortEarly: false });

  if (error) {
    return res.status(400).json({
      message: 'Validation failed',
      details: error.details.map(d => d.message),
    });
  }

  try {
    const plan = await generatePlanFromAI(value);
    return res.status(200).json({ plan });
  } catch (err) {
    console.error('❌ AI Plan Generation Error:', err.message);
    return res.status(500).json({ message: 'Failed to generate study plan' });
  }
};
