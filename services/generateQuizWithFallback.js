const generateWithOpenAI = require('./providers/openaiQuiz');
const generateWithGemini = require('./providers/geminiQuiz');
const generateWithCohere = require('./providers/cohereQuiz');

const generateQuizWithFallback = async (topic) => {
  try {
    return await generateWithOpenAI(topic);
  } catch (err1) {
    console.warn('❌ OpenAI failed, trying Gemini...');
    try {
      return await generateWithGemini(topic);
    } catch (err2) {
      console.warn('❌ Gemini failed, trying Cohere...');
      try {
        return await generateWithCohere(topic);
      } catch (err3) {
        console.error('❌ All providers failed');
        throw new Error('All AI quiz generators failed.');
      }
    }
  }
};

module.exports = generateQuizWithFallback;
