import createDebugger from './debug';
import promiseWithTimeout from './promise-with-timeout';
import JobResult from './job-result';

const debug = createDebugger('worker');

export default class Worker {
  browser = null;
  created = Date.now();

  /**
   * Creates a worker.
   * @param {puppeteer.Browser} browser The browser instance for worker to use
   */
  constructor(browser) {
    this.browser = browser;
  }

  /**
   * Executes a job handler and returns the job result.
   * @param {Job} job The job instance
   * @returns {Promise<JobResult>}
   */
  async run(job) {
    const { handler, input, timeout } = job.config;

    let output = null;
    let error = null;

    debug(`Running job: { input: ${input} }`);

    try {
      output = await (timeout
        ? promiseWithTimeout(handler(this.browser, input), timeout)
        : handler(this.browser, input));

      debug(
        `Job success: { input: ${input}, output: ${JSON.stringify(output)}}`
      );
    } catch (e) {
      error = e;

      debug(`Job error: { input: ${input}, error: ${error.message} }`);
    }

    return new JobResult({
      worker: this,
      type: error ? 'error' : 'success',
      input,
      output,
      error
    });
  }
}
