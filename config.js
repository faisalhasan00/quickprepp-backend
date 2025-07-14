require('dotenv').config();

function requireEnv(key) {
  if (!process.env[key]) {
    throw new Error(`❌ Missing required environment variable: ${key}`);
  }
  return process.env[key];
}

module.exports = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: process.env.PORT || 5000,
  CLIENT_URL: requireEnv('CLIENT_URL'),
  MONGO_URI: requireEnv('MONGO_URI'),
  JWT_SECRET: requireEnv('JWT_SECRET'),

  OPENAI_API_KEY: requireEnv('OPENAI_API_KEY'),
  GEMINI_API_KEY: requireEnv('GEMINI_API_KEY'),
  COHERE_API_KEY: requireEnv('COHERE_API_KEY'),
  ASSEMBLYAI_API_KEY: requireEnv('ASSEMBLYAI_API_KEY'),
  WEBHOOK_BASE_URL: process.env.WEBHOOK_BASE_URL || '', // optional
};
