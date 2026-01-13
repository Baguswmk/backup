export const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const nextTick = (callback) => Promise.resolve().then(callback);

export const deferExecution = (callback) => delay(0).then(callback);

export const retryWithBackoff = async (fn, options = {}) => {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    factor = 2,
  } = options;

  let lastError;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt < maxRetries - 1) {
        const delayMs = Math.min(
          initialDelay * Math.pow(factor, attempt),
          maxDelay
        );
        await delay(delayMs);
      }
    }
  }

  throw lastError;
};
