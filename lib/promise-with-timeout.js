/**
 * Error to be thrown when promise time limit is reached.
 */
export class TimeoutError extends Error {
  constructor(...args) {
    super(...args);
    Error.captureStackTrace(this, TimeoutError);
  }
}

/**
 * Returns a promise that will either evaluate a given promise or timeout after a given time limit.
 *
 * @param {Promise} promise Promise to evaluate
 * @param {Number} limit Time (in milliseconds) before throwing timeout error
 * @returns {Promise<*>}
 */
export default async function promiseWithTimeout(promise, limit) {
  let timeout;

  try {
    return await Promise.race([
      promise,
      new Promise((resolve, reject) => {
        timeout = setTimeout(() => {
          reject(new TimeoutError(`Timeout after ${limit}ms`));
        }, limit);
      })
    ]);
  } catch (e) {
    throw new Error(e.message);
  } finally {
    clearTimeout(timeout);
  }
}
