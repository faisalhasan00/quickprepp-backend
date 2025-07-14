require('dotenv').config();

let cohere;
try {
  if (process.env.COHERE_API_KEY) {
    const cohereImport = require('cohere-ai');
    cohere = cohereImport.default || cohereImport; // 🛠 handles CommonJS & ESM
    cohere.init(process.env.COHERE_API_KEY);
  }
} catch (err) {
  console.warn("⚠️  Couldn't load cohere-ai:", err.message);
}

/**
 * generateQuiz
 * @param {Object}  params
 * @param {string}  params.topic
 * @param {number}  params.numQuestions
 * @param {string}  params.difficulty
 * @param {string}  params.language
 * @returns {Promise<Array>}  quiz questions
 */
async function generateQuiz({
  topic,
  numQuestions = 5,
  difficulty = 'medium',
  language = 'en',
} = {}) {
  // ---------- 1. Fallback ----------
  if (!cohere) {
    console.warn('⚠️  COHERE_API_KEY not set or cohere not initialized – returning stub quiz.');
    return Array.from({ length: numQuestions }).map((_, i) => ({
      question: `Cohere stub Q${i + 1}: What is ${topic}?`,
      options: { A: 'Option A', B: 'Option B', C: 'Option C', D: 'Option D' },
      answer: 'A',
      explanation: 'Placeholder explanation.',
    }));
  }

  // ---------- 2. Prompt ----------
  const prompt = `
Generate a ${numQuestions}-question multiple‑choice quiz about "${topic}" 
(difficulty: ${difficulty}) in ${language}. Return ONLY valid JSON in this format:
[
  {
    "question": "string",
    "options": { "A": "string", "B": "string", "C": "string", "D": "string" },
    "answer": "A",
    "explanation": "string"
  }
]
`;

  try {
    // ---------- 3. Cohere API call ----------
    const response = await cohere.generate({
      model: 'command-r-plus',
      prompt,
      max_tokens: 800,
      temperature: 0.7,
    });

    const text = response.body.generations[0].text.trim();

    // ---------- 4. Parse JSON ----------
    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed)) throw new Error('Invalid format: Not an array');
    return parsed;
  } catch (err) {
    console.error('❌ Error generating or parsing Cohere quiz:', err.message);
    return [
      {
        question: `Error fallback: Unable to generate quiz for "${topic}".`,
        options: { A: 'N/A', B: 'N/A', C: 'N/A', D: 'N/A' },
        answer: 'A',
        explanation: 'Quiz generation failed. Using fallback.',
      },
    ];
  }
}

module.exports = { generateQuiz };
