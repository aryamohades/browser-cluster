import Cluster from '../lib/cluster';

/**
 * Simple job handler example
 * 1. Queues a search term with the cluster.
 * 2. Navigates to google news results page for that term.
 * 3. Clicks on the first news result to go to the web page.
 * 4. Extracts the page title.
 */
async function getPageTitle(browser, data) {
  const page = await browser.newPage();

  await page.goto(`https://www.google.com/search?q=${data}&tbm=nws`, {
    waitUntil: 'networkidle2'
  });

  await Promise.all([page.waitForNavigation(), page.click('#search g-card a')]);

  const title = await page.title();

  return title;
}

(async () => {
  const cluster = await Cluster.create({
    headless: true,
    maxConcurrency: 3,
    workerCreationDelay: 350,
    handler: getPageTitle,
    timeout: 12000
  });

  ['bitcoin', 'nasdaq', 'gold'].forEach(data => {
    cluster.queue(data);
  });

  await cluster.idle();
  await cluster.close();

  process.exit(0);
})();
