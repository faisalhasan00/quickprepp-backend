const axios = require('axios');
const chalk = require('chalk');

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Validate API keys at startup
if (!OPENAI_API_KEY || !GEMINI_API_KEY) {
  throw new Error('❌ Both OPENAI_API_KEY and GEMINI_API_KEY must be set in environment variables');
}

const apiClient = axios.create({
  timeout: 15000,
  maxRedirects: 0,
});

// API configs
const API_CONFIG = {
  openai: {
    url: 'https://api.openai.com/v1/chat/completions',
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
  },
  gemini: {
    url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${GEMINI_API_KEY}`,
    headers: {
      'Content-Type': 'application/json',
    },
  },
};

// Retry logic for calling LLM
async function callLLM(prompt, provider, retries = 3) {
  const config = API_CONFIG[provider];
  if (!config) throw new Error(`Unsupported provider: ${provider}`);

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const payload =
        provider === 'openai'
          ? {
              model: 'gpt-3.5-turbo',
              messages: [{ role: 'user', content: prompt }],
              temperature: 0.7,
            }
          : {
              contents: [{ parts: [{ text: prompt }] }],
            };

      const response = await apiClient.post(config.url, payload, { headers: config.headers });

      return provider === 'openai'
        ? response.data.choices?.[0]?.message?.content || ''
        : response.data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    } catch (err) {
      console.warn(`⚠️ ${provider} attempt ${attempt} failed:`, err.response?.status || err.message);
      if (attempt === retries) throw err;
      await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
    }
  }
}

// Public API: Generate follow-up question
async function generateFollowupQuestion(lastQuestion, userAnswer) {
  if (typeof lastQuestion !== 'string' || typeof userAnswer !== 'string' || !lastQuestion.trim() || !userAnswer.trim()) {
    throw new Error('Invalid input: lastQuestion and userAnswer must be non-empty strings');
  }

  const prompt = `
You are a professional technical interviewer.

You asked: "${lastQuestion}"
The candidate answered: "${userAnswer}"

Generate ONE smart, short follow-up question that:
- Probes deeper into the candidate's response
- Tests specific technical or behavioral knowledge
- Maintains a natural conversational tone
- Should be max 15 words

Return ONLY the follow-up question. No formatting. No explanations.
`;

  try {
    const result = await callLLM(prompt, 'openai', 2);
    console.log(chalk.green('✅ Follow-up generated via OpenAI'));
    return { question: result.trim() };
  } catch (openaiError) {
    console.log(chalk.yellow('⚠️ Falling back to Gemini...'));

    try {
      const fallbackResult = await callLLM(prompt, 'gemini', 2);
      console.log(chalk.green('✅ Follow-up generated via Gemini'));
      return { question: fallbackResult.trim() };
    } catch (geminiError) {
      console.error(chalk.red('❌ Both OpenAI and Gemini failed'), geminiError.message);
      return {
        question: 'Can you explain that further or give a real-world example?',
      };
    }
  }
}

module.exports = { generateFollowupQuestion };
