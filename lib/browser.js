import puppeteer from 'puppeteer';
import createDebugger from './debug';

const debug = createDebugger('browser');

const RESOURCE_TYPE_FILTER = new Set(['image', 'stylesheet', 'font']);

export default class Browser {
  config = {
    headless: true
  };

  closing = false;
  browser = null;

  /**
   * Creates a browser.
   * @param {Object} [config] The browser configuration
   * @param {Boolean} [config.headless=true] Determines if the browser runs in headless mode
   */
  constructor(config) {
    Object.assign(this.config, config);
  }

  /**
   * Creates and initializes a new browser instance.
   * @param {Object} config The browser configuration
   * @returns {Promise<Browser>}
   */
  static async create(config) {
    const browser = new Browser(config);

    // Create the underlying chrome browser instance
    browser.browser = await puppeteer.launch({
      headless: browser.config.headless
    });

    // Listen to browser disconnected event
    browser.browser.on('disconnected', () => {
      browser.closing = true;
    });

    return browser;
  }

  /**
   * Creates and configures a new browser page.
   * @returns {Promise<puppeteer.Page>}
   */
  async newPage() {
    // Get new page
    const page = await this.browser.newPage();

    // Enable request interception on the page
    await page.setRequestInterception(true);

    // Listen to page request event
    page.on('request', request => {
      if (this.closing) {
        // Browser is closing, skip
        return;
      }

      // Use filter to determine if the resource should be blocked from loading
      if (RESOURCE_TYPE_FILTER.has(request.resourceType())) {
        request.abort();
      } else {
        request.continue();
      }
    });

    // Listen to page error event
    page.on('error', error => {
      debug(`Page error: ${error.message}`);
    });

    return page;
  }

  /**
   * Closes the browser.
   * @returns {Promise<Browser>}
   */
  async close() {
    this.closing = true;

    try {
      await this.browser.close();
    } catch (e) {
      debug(`Error while closing browser: ${e.message}`);
    }

    return this;
  }
}
