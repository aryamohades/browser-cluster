import createDebugger from './debug';
import Browser from './browser';
import Worker from './worker';
import Job from './job';

const debug = createDebugger('cluster');

const CHECK_FOR_WORK_INTERVAL = 100;

export default class Cluster {
  config = {
    maxConcurrency: 1,
    workerCreationDelay: 0,
    headless: true,
    handler: null,
    timeout: null
  };

  closing = false;
  jobs = [];
  browsers = [];
  workers = [];
  workersAvailable = [];
  workersBusy = [];
  workersStarted = 0;
  idleResolve = null;
  checkForWorkInterval = null;
  createWorkerInterval = null;

  /**
   * Creates a cluster.
   * @param {Object} [config] The cluster configuration
   * @param {Number} [config.maxConcurrency=1] The maximum number of workers to run
   * @param {Number} [config.workerCreationDelay=0] The minimum time (in ms) to wait in between creating workers
   * @param {Boolean} [config.headless=true] Determines if the browser runs in headless mode
   * @param {Function} [config.handler=null] The default job handler function
   * @param {Number} [config.timeout=null] The default job execution time limit (in milliseconds)
   */
  constructor(config) {
    Object.assign(this.config, config);
  }

  /**
   * Creates and initializes a new cluster instance.
   * @param {Object} config The cluster configuration
   * @returns {Promise<Cluster>}
   */
  static async create(config) {
    const cluster = new Cluster(config);

    if (cluster.config.workerCreationDelay > 0) {
      // If workerCreationDelay is provided, start worker creation interval
      cluster.createWorkerInterval = setInterval(() => {
        cluster.createWorker();
      }, cluster.config.workerCreationDelay);
    } else {
      // No worker creation delay, initialize all workers
      const initializeWorkers = [];

      // Create cluster workers
      for (let i = 0; i < cluster.config.maxConcurrency; ++i) {
        initializeWorkers.push(cluster.createWorker());
      }

      await Promise.all(initializeWorkers);
    }

    // Start work interval
    this.checkForWorkInterval = setInterval(
      () => cluster.checkForWork(),
      CHECK_FOR_WORK_INTERVAL
    );

    return cluster;
  }

  /**
   * Creates a new worker.
   * @returns {Promise}
   */
  async createWorker() {
    this.workersStarted += 1;

    if (this.workersStarted > this.config.maxConcurrency) {
      // Reached maximum number of workers, clear interval and skip worker creation
      clearInterval(this.createWorkerInterval);

      return;
    }

    debug('Creating worker');

    let browser;

    try {
      debug('Creating browser for worker');

      // Get browser for worker
      browser = await Browser.create({ headless: this.config.headless });
    } catch (e) {
      throw new Error(`Error while launching browser: ${e.message}`);
    }

    // Add browser to browsers
    this.browsers.push(browser);

    // Create new worker
    const worker = new Worker(browser);

    // Add worker to workers
    this.workers.push(worker);

    // Add worker to available workers
    this.workersAvailable.push(worker);
  }

  /**
   * Checks if work can be performed and if so, assigns the next job in the queue to an available worker.
   */
  async checkForWork() {
    if (this.closing) {
      // Cluster is closing, skip
      return;
    }

    if (this.jobs.length === 0) {
      // No jobs available, perform idle check and skip
      this.checkIdle();

      return;
    }

    if (this.workersAvailable.length === 0) {
      // No workers available, skip
      return;
    }

    // Get next job from queue
    const job = this.jobs.shift();

    // Get available worker
    const worker = this.workersAvailable.shift();

    // Add worker to busy workers
    this.workersBusy.push(worker);

    // Check if another worker is available
    if (this.workersAvailable.length !== 0) {
      // We can do more work in parallel
      this.checkForWork();
    }

    // Do the job
    // eslint-disable-next-line no-unused-vars
    const result = await worker.run(job);

    // @TODO: do something with result e.g. invoke success/error callbacks based on result.type

    // Remove worker from busy workers
    this.workersBusy.splice(this.workersBusy.indexOf(worker), 1);

    // Add worker back to available workers
    this.workersAvailable.push(worker);

    // Job is complete, check for more work now
    this.checkForWork();
  }

  /**
   * Queues a job to be executed using the given data and configuration.
   * @param {*} input The job input data
   * @param {Object} [config] The job configuration
   * @param {Function} [config.handler] The job handler function
   * @param {Number} [config.timeout] The time (in milliseconds) before timing out the job execution
   */
  queue(
    input = null,
    { handler = this.config.handler, timeout = this.config.timeout } = {}
  ) {
    debug(`Queuing job: { input: ${input} }`);

    const job = new Job({
      handler,
      input,
      timeout
    });

    this.jobs.push(job);
  }

  /**
   * Resolves the idle promise if there are no busy workers.
   */
  checkIdle() {
    if (this.workersBusy.length === 0 && this.idleResolve) {
      debug('Cluster is now idle');

      // Cluster is now idle, resolve the idle promise
      this.idleResolve();
    }
  }

  /**
   * Returns a promise that is resolved when the cluster becomes idle.
   * @returns {Promise}
   */
  idle() {
    return new Promise(resolve => {
      this.idleResolve = resolve;
    });
  }

  /**
   * Closes the cluster by clearing intervals and shutting down all browsers.
   * @returns {Promise<Cluster>}
   */
  async close() {
    this.closing = true;

    // Clear intervals
    clearInterval(this.checkForWorkInterval);
    clearInterval(this.createWorkerInterval);

    // Close all browsers
    await Promise.all(this.browsers.map(browser => browser.close()));

    debug('Closed cluster');

    return this;
  }
}
