module.exports = async function asyncRetry(fn, { retries = 3, baseDelay = 1_000 } = {}) {
  let attempt = 0;
  while (attempt <= retries) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === retries) throw err;
      const delay = baseDelay * 2 ** attempt + Math.random() * 200;
      attempt += 1;
      require('../utils/logger').warn(`retry ${attempt}/${retries} after error: ${err.message}`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
};
