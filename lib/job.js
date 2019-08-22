export default class Job {
  config = {
    handler: null,
    input: null,
    timeout: null
  };

  /**
   * Creates a job.
   *
   * @param {Object} config The job configuration
   * @param {Function} [config.handler] The job handler function
   * @param {*} [config.input=null] The job input data
   * @param {Number} [config.timeout=null] The job execution time limit (in milliseconds)
   */
  constructor(config) {
    Object.assign(this.config, config);
  }
}
