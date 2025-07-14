// Backend/providers/openaiQuiz.js
require('dotenv').config();

let openai;
try {
  // Lazy‑load the SDK only if an API key is present
  if (process.env.OPENAI_API_KEY) {
    const { OpenAI } = require('openai');
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
} catch (err) {
  console.warn("⚠️  Couldn't load OpenAI SDK:", err.message);
}

/**
 * generateQuiz
 * @param {Object}  params
 * @param {string}  params.topic        – Topic of the quiz
 * @param {number}  params.numQuestions – How many questions (default 5)
 * @param {string}  params.difficulty   – easy | medium | hard (optional)
 * @param {string}  params.language     – ISO language code, default 'en'
 * @returns {Promise<Array>}            – Array of quiz Q&A objects
 */
async function generateQuiz({
  topic,
  numQuestions = 5,
  difficulty = 'medium',
  language = 'en',
} = {}) {
  // ---------- 1. No API key? Return a stub quiz so the app still works ----------
  if (!openai) {
    console.warn('⚠️  OPENAI_API_KEY not set – returning stub quiz.');
    return Array.from({ length: numQuestions }).map((_, i) => ({
      question: `Stub Q${i + 1}: What is ${topic}?`,
      options: { A: 'Option A', B: 'Option B', C: 'Option C', D: 'Option D' },
      answer: 'A',
      explanation: 'This is a placeholder answer.',
    }));
  }

  // ---------- 2. Build the prompt ----------
  const prompt = `
Generate a ${numQuestions}-question multiple‑choice quiz about "${topic}" 
(difficulty: ${difficulty}) in ${language}. 
Return **only** valid JSON in this exact shape:
[
  {
    "question": "string",
    "options": { "A": "string", "B": "string", "C": "string", "D": "string" },
    "answer": "A",
    "explanation": "string"
  },
  ...
]
`;

  // ---------- 3. Call OpenAI ----------
  const { choices } = await openai.chat.completions.create({
    model: 'gpt-4o-mini', // pick your model
    temperature: 0.7,
    messages: [
      { role: 'system', content: 'You are a helpful quiz‑generating assistant.' },
      { role: 'user', content: prompt },
    ],
  });

  // ---------- 4. Parse and return ----------
  try {
    const quiz = JSON.parse(choices[0].message.content.trim());
    return quiz;
  } catch (err) {
    console.error('❌  Failed to parse quiz JSON:', err.message);
    throw new Error('Invalid quiz format returned by OpenAI.');
  }
}

module.exports = { generateQuiz };
