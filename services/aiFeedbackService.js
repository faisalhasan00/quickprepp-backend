const axios = require('axios');
const { jsonrepair } = require('jsonrepair');
const crypto = require('crypto');

const logger = require('../utils/logger');
const { COHERE_API_KEY } = require('../config');      // centralised env loader
const asyncRetry = require('../utils/asyncRetry');    // tiny reusable helper

/* ------------------------------------------------------------------ */
/*                      JSON-parsing & validation                      */
/* ------------------------------------------------------------------ */

function hash(str) {
  return crypto.createHash('sha1').update(str).digest('hex').slice(0, 8);
}

/**
 * Robustly parse Cohere-style JSON, repairing common mistakes.
 * Throws if validation fails so the caller can handle 500 vs 400.
 */
function parseFeedbackJSON(text) {
  // Extract first JSON block
  const match = text.match(/\{[\s\S]*?\}/);
  if (!match) throw new Error('No JSON object found in response');

  const repaired = jsonrepair(match[0]);
  const parsed = JSON.parse(repaired);

  // Normalise / clamp score
  if (typeof parsed.score === 'number') {
    parsed.score = Math.min(10, Math.max(0, parsed.score));
  }

  const keysOK =
    typeof parsed.strengths === 'string' &&
    typeof parsed.improvements === 'string' &&
    typeof parsed.overall === 'string' &&
    typeof parsed.score === 'number' &&
    parsed.soft_skills &&
    ['confidence', 'clarity', 'filler_words', 'tone', 'pace'].every(
      k => typeof parsed.soft_skills[k] === 'string',
    );

  if (!keysOK) throw new Error('JSON missing required keys or wrong types');

  return parsed;
}

/* ------------------------------------------------------------------ */
/*                          Main export                                */
/* ------------------------------------------------------------------ */

/**
 * Generate AI feedback for a candidate answer.
 * @param {object} params
 * @param {string} params.answer   – The candidate answer
 * @param {string} params.question – The interview question
 * @param {string} params.jobRole  – Job role context
 * @returns {Promise<object>}      – Parsed feedback JSON
 */
async function generateFeedback({ answer, question, jobRole }) {
  if (!COHERE_API_KEY) {
    throw new Error('Missing COHERE_API_KEY'); // will bubble to global handler
  }

  /* ----------- protect LLM context & billing ------------------ */
  const Answer = answer.slice(0, 4_000);   // Cohere hard limit 4k chars
  const Question = question.slice(0, 500); // keep prompts lean

  const systemPrompt = `
You are an expert interview feedback assistant.

Return ONLY valid minified JSON in the exact schema below – no markdown.

{
  "strengths": "...",                 // string
  "improvements": "...",              // string
  "overall": "...",                   // string
  "score": 0-10,                      // number
  "soft_skills": {                    // object
    "confidence": "...",
    "clarity": "...",
    "filler_words": "...",
    "tone": "...",
    "pace": "..."
  }
}
`;

  const userPrompt = `
Role: ${jobRole}

Interview Question:
"${Question}"

Candidate Answer:
"${Answer}"
`;

  /* ----------- Cohere call wrapped in asyncRetry -------------- */
  const callCohere = async () => {
    const { data } = await axios.post(
      'https://api.cohere.ai/v1/chat',
      {
        model: 'command-r-plus',
        temperature: 0.7,
        preamble: systemPrompt,
        chat_history: [],
        message: userPrompt,
      },
      {
        headers: {
          Authorization: `Bearer ${COHERE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 15_000,
      },
    );

    return data.text;
  };

  const raw = await asyncRetry(callCohere, { retries: 2, baseDelay: 2_000 });

  logger.debug(`[aiFeedback] cohereRespHash=${hash(raw)}`);

  return parseFeedbackJSON(raw);
}

module.exports = { generateFeedback };
