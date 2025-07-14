//ResuemeopenaiService
const axios = require('axios');
require('dotenv').config();

// -----------------------------
// 🔹 API Clients Setup
// -----------------------------

const openaiAPI = axios.create({
  baseURL: 'https://api.openai.com/v1',
  headers: {
    Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    'Content-Type': 'application/json',
  },
});

const cohereAPI = axios.create({
  baseURL: 'https://api.cohere.ai/v1/chat',
  headers: {
    Authorization: `Bearer ${process.env.COHERE_API_KEY}`,
    'Content-Type': 'application/json',
  },
});

// -----------------------------
// 🔹 Utility: Safe JSON Parser
// -----------------------------
function safeJSONParse(text) {
  try {
    const cleaned = text.trim().replace(/^```json\s*/, '').replace(/\s*```$/, '');
    return JSON.parse(cleaned);
  } catch (err) {
    throw new Error(`❌ Failed to parse JSON: ${err.message}`);
  }
}

// -----------------------------
// 🔹 Parse Job Description
// -----------------------------
async function parseJobDescription(jdText) {
  if (!jdText || typeof jdText !== 'string' || jdText.trim() === '') {
    throw new Error('❌ Job description must be a non-empty string.');
  }

  const prompt = `
Extract structured details from the job description and return ONLY JSON:
{
  "hardSkills": ["..."],
  "softSkills": ["..."],
  "responsibilities": ["..."],
  "tone": "...",
  "summary": "..."
}

Job Description:
"""${jdText}"""
`;

  try {
    const response = await openaiAPI.post('/chat/completions', {
      model: process.env.OPENAI_MODEL || 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
    });

    return safeJSONParse(response.data.choices[0].message.content);
  } catch (openAIError) {
    console.error('[OpenAI Error] JD parsing failed. Falling back to Cohere:', openAIError.message);

    try {
      const response = await cohereAPI.post('', {
        model: 'command-r-plus',
        message: prompt,
        temperature: 0.3,
        max_tokens: 1000,
      });

      return safeJSONParse(response.data.text.trim());
    } catch (cohereError) {
      console.error('[Cohere Fallback Error] JD parsing failed:', cohereError.message);
      throw new Error('❌ JD parsing failed via both OpenAI and Cohere.');
    }
  }
}

// -----------------------------
// 🔹 Parse Resume Text (Plain → JSON)
// -----------------------------
async function parseResumeText(resumeText) {
  const prompt = `
Convert the following resume text into JSON:
{
  "summary": "...",
  "skills": ["..."],
  "experience": [
    {
      "company": "...",
      "role": "...",
      "duration": "...",
      "description": ["..."]
    }
  ],
  "education": "...",
  "achievements": ["..."]
}

Resume:
"""${resumeText}"""
`;

  try {
    const response = await openaiAPI.post('/chat/completions', {
      model: process.env.OPENAI_MODEL || 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
    });

    return safeJSONParse(response.data.choices[0].message.content);
  } catch (openAIError) {
    console.warn('[OpenAI Parse Error]:', openAIError.message);

    try {
      const response = await cohereAPI.post('', {
        model: 'command-r-plus',
        message: prompt,
        temperature: 0.3,
        max_tokens: 1000,
      });

      return safeJSONParse(response.data.text.trim());
    } catch (cohereError) {
      console.error('[Cohere Parse Error]:', cohereError.message);
      console.warn('⚠️ Falling back to regex resume parser.');

      try {
        const skillsMatch = resumeText.match(/Skills[:\-]?\s*(.+)/i);
        const educationMatch = resumeText.match(/Education[:\-]?\s*((?:.|\n)*?)(?=\n[A-Z][a-z]+:|\n$)/i);
        const experienceMatch = resumeText.match(/Experience[:\-]?\s*((?:.|\n)*?)(?=\n[A-Z][a-z]+:|\n$)/i);
        const achievementsMatch = resumeText.match(/Achievements[:\-]?\s*((?:.|\n)*?)(?=\n[A-Z][a-z]+:|\n$)/i);

        return {
          summary: '',
          skills: skillsMatch?.[1]?.split(',').map(s => s.trim()) || [],
          experience: experienceMatch?.[1]
            ?.split('\n')
            .filter(Boolean)
            .map(e => ({
              company: '',
              role: e.split('-')[0]?.trim() || '',
              duration: '',
              description: [e.trim()],
            })) || [],
          education: educationMatch?.[1]?.trim() || '',
          achievements: achievementsMatch?.[1]?.split('\n').map(a => a.trim()).filter(Boolean) || [],
        };
      } catch (regexErr) {
        throw new Error('❌ Resume parsing failed using all methods.');
      }
    }
  }
}

// -----------------------------
// 🔹 Optimize Resume (JSON → JSON)
// -----------------------------
async function optimizeResume(jobDescription, resumeJson) {
  const prompt = `
You're an expert resume coach. Improve the user's resume for this job:
- Use better tone and relevant phrasing
- Keep structure: summary, skills, experience, education, achievements
- Do NOT invent experiences

Job Description:
"""${jobDescription}"""

User Resume:
${JSON.stringify(resumeJson, null, 2)}

Return ONLY the improved resume in JSON.
`;

  try {
    const response = await openaiAPI.post('/chat/completions', {
      model: process.env.OPENAI_MODEL || 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.4,
    });

    return safeJSONParse(response.data.choices[0].message.content);
  } catch (openAIError) {
    console.warn('[OpenAI Optimization Error]:', openAIError.message);

    try {
      const response = await cohereAPI.post('', {
        model: 'command-r-plus',
        message: prompt,
        temperature: 0.4,
        max_tokens: 1000,
      });

      return safeJSONParse(response.data.text.trim());
    } catch (cohereError) {
      console.error('[Cohere Optimization Error]:', cohereError.message);
      throw new Error('❌ Resume optimization failed with both OpenAI and Cohere.');
    }
  }
}

// -----------------------------
// 🔹 Generate Matched Resume (Text → Text)
// -----------------------------
async function generateMatchedResume(jobDescription, resumeText) {
  const prompt = `
You are an expert resume writer.

Revise this resume to perfectly match the job description:
- Ensure ATS compatibility
- Use keywords and skills from JD
- Keep formatting clean and concise
- Remove irrelevant info
- Keep to 1–2 pages

Job Description:
"""${jobDescription}"""

Resume:
"""${resumeText}"""

Return ONLY the improved resume in plain text.
`;

  try {
    const response = await openaiAPI.post('/chat/completions', {
      model: process.env.OPENAI_MODEL || 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.5,
    });

    return response.data.choices[0].message.content.trim();
  } catch (openAIError) {
    console.warn('[OpenAI Resume Rewriting Error]:', openAIError.message);
    console.warn('⚠️ Falling back to Cohere...');

    try {
      const fallback = await cohereAPI.post('', {
        model: 'command-r-plus',
        message: prompt,
        temperature: 0.5,
        max_tokens: 1200,
      });

      return fallback.data.text.trim();
    } catch (cohereError) {
      console.error('[Cohere Resume Rewriting Error]:', cohereError.message);
      throw new Error('❌ Resume rewriting failed via both OpenAI and Cohere.');
    }
  }
}

// -----------------------------
// 🔹 Exports
// -----------------------------
module.exports = {
  parseJobDescription,
  parseResumeText,
  optimizeResume,
  generateMatchedResume,
};
