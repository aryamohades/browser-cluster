export default class JobResult {
  worker = null;
  type = null;
  input = null;
  output = null;
  error = null;

  /**
   * Creates a job result.
   * @param {Object} config The job result configuration
   * @param {Worker} config.worker The job worker
   * @param {'success'|'error'} config.type The job result type
   * @param {*} [config.input=null] The job input data
   * @param {*} [config.output=null] The job output data
   * @param {Error|null} [config.error=null] The job error
   */
  constructor(config) {
    Object.assign(this, config);
  }
}
