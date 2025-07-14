// jdController.js

const { processResume, extractJDDetails } = require('../services/resumeService');

/**
 * POST /api/resume/optimize
 * Optimizes a resume (text or JSON) to match a job description.
 * Request body:
 * {
 *   jobDescription: "string",
 *   resumeInput: "string | JSON",
 *   outputFormat: "json" | "text"   // optional, defaults to 'json'
 * }
 */
const optimizeResumeHandler = async (req, res) => {
  try {
    const { jobDescription, resumeInput, outputFormat } = req.body;

    if (!jobDescription || !resumeInput) {
      return res.status(400).json({
        success: false,
        message: 'Job description and resume input are required.',
      });
    }

    const optimizedResume = await processResume({
      jobDescription,
      resumeInput,
      outputFormat: outputFormat || 'json',
    });

    return res.status(200).json({
      success: true,
      data: optimizedResume,
    });

  } catch (error) {
    console.error('[Optimize Resume Error]:', error.message);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error during resume optimization.',
    });
  }
};

/**
 * POST /api/jd/parse
 * Extracts structure from a job description.
 * Request body:
 * {
 *   jdText: "string"
 * }
 */
const parseJDHandler = async (req, res) => {
  try {
    const { jdText } = req.body;

    if (!jdText || typeof jdText !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Job description text (jdText) is required.',
      });
    }

    const structuredJD = await extractJDDetails(jdText);

    return res.status(200).json({
      success: true,
      data: structuredJD,
    });

  } catch (error) {
    console.error('[Parse JD Error]:', error.message);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error during JD parsing.',
    });
  }
};

module.exports = {
  optimizeResumeHandler,
  parseJDHandler,
};
