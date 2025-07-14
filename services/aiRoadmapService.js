// services/aiRoadmapService.js
const { CohereClient } = require('cohere-ai');
const axios = require('axios');
const { jsonrepair } = require('jsonrepair');
const chalk = require('chalk');

const {
  COHERE_API_KEY,
  OPENAI_API_KEY,          // optional fallback
} = process.env;

if (!COHERE_API_KEY) throw new Error('❌ COHERE_API_KEY missing in env');

const cohere = new CohereClient({ token: COHERE_API_KEY });

/* ------------------------------------------------------------------ */
/*                           Helper utilities                          */
/* ------------------------------------------------------------------ */

// retry helper with back-off + jitter
async function retry(fn, times = 2) {
  for (let attempt = 0; attempt <= times; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === times) throw err;
      const delay = 1000 * 2 ** attempt + Math.random() * 200;
      console.warn(`⚠️ retry ${attempt + 1}/${times}: ${err.message}`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
}

// extract first JSON array in text, repair & parse
function extractPlan(text) {
  const start = text.indexOf('[');
  const end   = text.lastIndexOf(']');
  if (start === -1 || end === -1) throw new Error('No JSON array found');

  const repaired = jsonrepair(text.slice(start, end + 1));
  const plan = JSON.parse(repaired);

  if (!Array.isArray(plan) || plan.length === 0) {
    throw new Error('Parsed plan is not a non-empty array');
  }
  return plan;
}

/* ------------------------------------------------------------------ */
/*                 Main export – generate study plan                   */
/* ------------------------------------------------------------------ */

exports.generatePlanFromAI = async (params) => {
  const { goal, hoursPerDay, daysPerWeek, skillLevel, totalDurationWeeks } = params;

  const prompt = `
You are an expert career coach. Create a ${totalDurationWeeks}-week study plan for someone who wants to become a “${goal}”.

Details:
- Skill Level: ${skillLevel}
- Daily Time: ${hoursPerDay} hours
- Days per Week: ${daysPerWeek}

✅ Format:
Return ONLY a pure JSON array like:
[
  {
    "week": 1,
    "topics": ["", ""],
    "projects": ["", ""],
    "resources": ["", ""],
    "summary": ""
  }
  ...
]
No markdown, no explanations.
  `.trim();

  /* ----------- 1ᵗ try — Cohere ----------------------------------- */
  try {
    const raw = await retry(() =>
      cohere.generate({
        model: 'command-r-plus',
        prompt,
        temperature: 0.7,
        maxTokens: 1500,
      })
    );

    const text = raw.generations?.[0]?.text?.trim() || '';
    const plan = extractPlan(text);

    console.log(chalk.green('✅ Study plan generated via Cohere'));
    return plan;
  } catch (cohereErr) {
    console.error(chalk.yellow('⚠️ Cohere failed:'), cohereErr.message);

    /* ------ optional fallback to OpenAI if key present ----------- */
    if (!OPENAI_API_KEY) throw new Error('Failed to generate study plan');

    try {
      const openaiResp = await retry(() =>
        axios.post(
          'https://api.openai.com/v1/chat/completions',
          {
            model: 'gpt-3.5-turbo',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.7,
          },
          { headers: { Authorization: `Bearer ${OPENAI_API_KEY}` }, timeout: 20000 }
        )
      );

      const text = openaiResp.data.choices?.[0]?.message?.content?.trim() || '';
      const plan = extractPlan(text);

      console.log(chalk.green('✅ Study plan generated via OpenAI fallback'));
      return plan;
    } catch (openaiErr) {
      console.error(chalk.red('❌ Both Cohere and OpenAI failed'), openaiErr.message);
      throw new Error('Failed to generate study plan');
    }
  }
};
