// Backend/providers/geminiQuiz.js
require('dotenv').config();

let geminiClient;
try {
  if (process.env.GEMINI_API_KEY) {
    // Google’s official SDK
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    geminiClient = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
} catch (err) {
    console.warn("⚠️  Couldn't load @google/generative‑ai:", err.message);
}

/**
 * generateQuiz
 * @param {Object}  params
 * @param {string}  params.topic
 * @param {number}  params.numQuestions
 * @param {string}  params.difficulty
 * @param {string}  params.language
 * @returns {Promise<Array>}  quiz objects
 */
async function generateQuiz({
  topic,
  numQuestions = 5,
  difficulty = 'medium',
  language = 'en',
} = {}) {
  /* ---------- 1. No API key? Return stub ---------- */
  if (!geminiClient) {
    console.warn('⚠️  GEMINI_API_KEY not set – returning stub quiz.');
    return Array.from({ length: numQuestions }).map((_, i) => ({
      question: `Gemini stub Q${i + 1}: What is ${topic}?`,
      options: { A: 'Option A', B: 'Option B', C: 'Option C', D: 'Option D' },
      answer: 'A',
      explanation: 'Placeholder answer.',
    }));
  }

  /* ---------- 2. Build prompt ---------- */
  const prompt = `
Generate a ${numQuestions}-question multiple‑choice quiz about "${topic}"
(difficulty: ${difficulty}) in ${language}. 
Return ONLY valid JSON in this exact shape:
[
  {
    "question": "string",
    "options": { "A": "string", "B": "string", "C": "string", "D": "string" },
    "answer": "A",
    "explanation": "string"
  }
]
`;

  /* ---------- 3. Call Gemini ---------- */
  const model = geminiClient.getGenerativeModel({ model: 'gemini-pro' });
  const result = await model.generateContent(prompt);
  const text   = result.response.text().trim();

  /* ---------- 4. Parse JSON ---------- */
  try {
    return JSON.parse(text);
  } catch (err) {
    console.error('❌  Gemini returned invalid JSON:', text.slice(0, 120));
    throw new Error('Invalid quiz JSON from Gemini.');
  }
}

module.exports = { generateQuiz };
