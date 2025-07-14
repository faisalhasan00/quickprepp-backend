const axios = require('axios');
const chalk = require('chalk');

// Load API keys from environment variables
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const COHERE_API_KEY = process.env.COHERE_API_KEY;

// Axios client
const apiClient = axios.create({
  timeout: 10000,
  maxRedirects: 0,
});

// API Config per provider
const API_CONFIG = {
  openai: {
    url: 'https://api.openai.com/v1/chat/completions',
    headers: () => {
      if (!OPENAI_API_KEY) throw new Error('Missing OpenAI API key');
      return { Authorization: `Bearer ${OPENAI_API_KEY}` };
    },
  },
  gemini: {
    url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${GEMINI_API_KEY}`,
    headers: () => {
      if (!GEMINI_API_KEY) throw new Error('Missing Gemini API key');
      return { 'Content-Type': 'application/json' };
    },
  },
  cohere: {
    url: 'https://api.cohere.ai/v1/chat',
    headers: () => {
      if (!COHERE_API_KEY) throw new Error('Missing Cohere API key');
      return {
        Authorization: `Bearer ${COHERE_API_KEY}`,
        'Content-Type': 'application/json',
      };
    },
  },
};

// Sleep helper
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

/**
 * Generic LLM caller with retries
 */
async function callLLM(prompt, provider, retries = 3) {
  const config = API_CONFIG[provider];
  if (!config) throw new Error(`Unsupported provider: ${provider}`);

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      let payload;
      if (provider === 'openai') {
        payload = {
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
        };
      } else if (provider === 'gemini') {
        payload = { contents: [{ parts: [{ text: prompt }] }] };
      } else if (provider === 'cohere') {
        payload = { message: prompt, temperature: 0.7 };
      }

      const response = await apiClient.post(config.url, payload, { headers: config.headers() });

      if (provider === 'openai') {
        return response.data.choices[0]?.message?.content || '';
      } else if (provider === 'gemini') {
        return response.data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      } else if (provider === 'cohere') {
        return response.data.text || '';
      }
    } catch (error) {
      console.error(chalk.red(`[${new Date().toISOString()}] Attempt ${attempt} failed for ${provider}: ${error.message}`));
      if (attempt === retries) throw error;
      await sleep(500 * attempt);
    }
  }
}

/**
 * Calculate number of questions
 */
function calculateQuestionCount(duration) {
  return Math.floor(duration / 2);
}

/**
 * Format output into clean numbered list
 */
function formatOutput(generatedText, totalQuestions) {
  const questions = generatedText
    .trim()
    .split('\n')
    .filter((line) => line.trim())
    .map((line, index) => {
      const cleanLine = line.replace(/^\s*\d+[\.\)]\s*/, '');
      return `${index + 1}. ${cleanLine.trim()}`;
    })
    .slice(0, totalQuestions);

  return { questions };
}

/**
 * Build LLM prompt dynamically with examples
 */
function buildPrompt({ mockType, roleOrSubject, subjectsOrTopics, companies, duration, easyCount, mediumCount, hardCount, totalQuestions }) {
  const isSubjectMock = mockType.toLowerCase().includes('subject');
  const hasCompanies = companies && companies.length > 0;

  return `
You are a professional mock interview question generator.

Generate exactly ${totalQuestions} interview questions based on:
- Mock Type: ${mockType}
- Role/Subject: ${roleOrSubject}
- Topics: ${subjectsOrTopics.join(', ')}
- Target Companies: ${hasCompanies ? companies.join(', ') : 'None'}
- Interview Duration: ${duration} minutes

### 🎯 Difficulty Distribution:
- ${easyCount} Easy (Fundamental concepts)
- ${mediumCount} Medium (Practical application)
- ${hardCount} Hard (Complex problem-solving)

### 🧠 Rules:
1. Start with basics, build toward complex
2. Mix technical and behavioral (${isSubjectMock ? 'mostly technical' : 'tech + behavioral'})
3. Use short, clear questions (max 15 words)
4. Reflect realistic interview timing
5. Include company name/year if known

${isSubjectMock ? `
6. Format each question like:
   - "What is a hash table? (Data Structures)"
   - "Explain BFS. (Graph Algorithms - Amazon, 2022)"
` : `
6. Mix types:
   - "Tell me about a time you failed. (Behavioral)"
   - "What is a race condition? (Concurrency - Microsoft, 2021)"
`}

### ✅ Format Output:
- Numbered list (1. to ${totalQuestions})
- One question per line
- No extra text (no greetings, intros, or explanations)

Example:
1. What is OOP? (OOP - Amazon, 2022)  
2. What is normalization? (DBMS - Flipkart)  
3. Describe a leadership challenge. (Behavioral)

❌ Do NOT include anything except the question list.
`.trim();
}

/**
 * Generate main interview questions
 */
async function generateMainQuestions(mockType, roleOrSubject, subjectsOrTopics, companies = [], duration) {
  const totalQuestions = calculateQuestionCount(duration);
  const easyCount = Math.round(totalQuestions * 0.3);
  const mediumCount = Math.round(totalQuestions * 0.4);
  const hardCount = totalQuestions - easyCount - mediumCount;

  const prompt = buildPrompt({
    mockType,
    roleOrSubject,
    subjectsOrTopics,
    companies,
    duration,
    easyCount,
    mediumCount,
    hardCount,
    totalQuestions,
  });

  try {
    const result = await callLLM(prompt, 'openai');
    console.log(chalk.green(`[${new Date().toISOString()}] ✅ OpenAI success`));
    return formatOutput(result, totalQuestions);
  } catch (openaiError) {
    console.warn(chalk.yellow(`[${new Date().toISOString()}] ⚠️ OpenAI failed, trying Gemini...`));
    try {
      const result = await callLLM(prompt, 'gemini');
      console.log(chalk.green(`[${new Date().toISOString()}] ✅ Gemini success`));
      return formatOutput(result, totalQuestions);
    } catch (geminiError) {
      console.warn(chalk.yellow(`[${new Date().toISOString()}] ⚠️ Gemini failed, trying Cohere...`));
      try {
        const result = await callLLM(prompt, 'cohere');
        console.log(chalk.green(`[${new Date().toISOString()}] ✅ Cohere success`));
        return formatOutput(result, totalQuestions);
      } catch (cohereError) {
        console.error(chalk.red(`[${new Date().toISOString()}] ❌ All providers failed`));
        throw new Error('All providers failed to generate questions.');
      }
    }
  }
}

module.exports = { generateMainQuestions };
