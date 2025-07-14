const {
  parseResumeText,
  optimizeResume,
  generateMatchedResume,
  parseJobDescription,
} = require('./ResuemeopenaiService');

/**
 * 🔍 Extracts name, email, and phone number from plain resume text
 */
function extractPersonalInfo(text) {
  const nameMatch = text.match(/^(.*?)(\n|$)/);
  const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  const phoneMatch = text.match(/(\+?\d{1,4}[\s.-]?)?(\(?\d{3,4}\)?[\s.-]?)?\d{3,4}[\s.-]?\d{4}/);

  return {
    name: nameMatch?.[1]?.trim() || "Your Name",
    email: emailMatch?.[0] || "your.email@example.com",
    mobile: phoneMatch?.[0] || "Your Phone Number",
  };
}

/**
 * Determines the type of resume input and returns an optimized resume
 * tailored to the job description.
 *
 * @param {Object} params
 * @param {string} params.jobDescription - Job description (plain text)
 * @param {string|object} params.resumeInput - Resume in plain text or JSON
 * @param {'json'|'text'} [params.outputFormat='json'] - Output format (json = structured, text = printable)
 * @returns {Promise<object|string>} Optimized resume in chosen format
 */
async function processResume({ jobDescription, resumeInput, outputFormat = 'json' }) {
  if (!jobDescription || !resumeInput) {
    throw new Error('❌ Both job description and resume input are required.');
  }

  const personalInfo = typeof resumeInput === 'string'
    ? extractPersonalInfo(resumeInput)
    : resumeInput.personalInfo || {
        name: 'Your Name',
        email: 'your.email@example.com',
        mobile: 'Your Phone Number'
      };

  // ----------- Structured JSON Output -----------
  if (outputFormat === 'json') {
    let structuredResume;

    if (typeof resumeInput === 'string') {
      // Convert plain text resume to structured JSON
      structuredResume = await parseResumeText(resumeInput);
    } else if (typeof resumeInput === 'object') {
      structuredResume = resumeInput;
    } else {
      throw new Error('❌ Resume input must be a string or a valid JSON object.');
    }

    // Optimize structured resume using AI
    const optimized = await optimizeResume(jobDescription, structuredResume);
    return {
      personalInfo,
      ...optimized
    };
  }

  // ----------- Plain Text Output -----------
  if (outputFormat === 'text') {
    if (typeof resumeInput !== 'string') {
      throw new Error('❌ For text output, resume input must be plain text.');
    }

    const optimizedText = await generateMatchedResume(jobDescription, resumeInput);
    return {
      personalInfo,
      data: optimizedText,
    };
  }

  // ----------- Invalid Format -----------
  throw new Error(`❌ Unsupported output format: "${outputFormat}". Use 'json' or 'text'.`);
}

/**
 * Extracts key components from a job description (skills, responsibilities, tone).
 *
 * @param {string} jdText - Raw job description
 * @returns {Promise<object>} Parsed JD data
 */
async function extractJDDetails(jdText) {
  if (!jdText || typeof jdText !== 'string' || jdText.trim().length === 0) {
    throw new Error('❌ Job description text is required.');
  }

  return await parseJobDescription(jdText);
}

module.exports = {
  processResume,
  extractJDDetails,
};
