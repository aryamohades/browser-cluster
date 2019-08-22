import cheerio from 'cheerio';
import Cluster from '../lib/cluster';

const TEXT_NODE = 3;

async function getGoogleNewsLinks(browser, data) {
  try {
    const requestStartTime = new Date().toISOString();

    const page = await browser.newPage();

    await page.goto(`https://www.google.com/search?q=${data}&tbm=nws`, {
      waitUntil: 'networkidle2'
    });

    const html = await page.content();

    const $ = cheerio.load(html);

    const links = $('#search g-card')
      .toArray()
      .map(el => {
        const linkEl = $(el);
        const texts = [];
        const stack = [linkEl];

        while (stack.length !== 0) {
          const el = stack.pop();

          const contents = el.contents();

          if (contents.length === 1 && contents[0].nodeType === TEXT_NODE) {
            const text = el
              .text()
              .trim()
              .split('\n')
              .join('');

            if (text) {
              texts.push(text);
            }
          } else {
            el.children().each((i, child) => stack.push($(child)));
          }
        }

        return {
          href: linkEl.attr('href'),
          texts
        };
      });

    const requestFinishTime = new Date().toISOString();

    return {
      links,
      count: links.length,
      requestStartTime,
      requestFinishTime
    };
  } catch (e) {
    throw new Error(`Error while collecting google news links: ${e.message}`);
  }
}

(async () => {
  const cluster = await Cluster.create({
    headless: true,
    maxConcurrency: 5,
    workerCreationDelay: 350,
    handler: getGoogleNewsLinks,
    timeout: 10000
  });

  ['bitcoin', 'nasdaq', 'gold'].forEach(data => {
    cluster.queue(data);
  });

  await cluster.idle();
  await cluster.close();

  process.exit(0);
})();
