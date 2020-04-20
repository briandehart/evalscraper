EvalScraper exports a Scraper class and a ScrapeTask class.

A Scraper instance accepts a ScrapeTask instance.

It returns an object with key: value pairs based on the ScrapeTask.

A Scraper instance is configured by optionally passing it an object at it's creation.

```
const Scraper = new Scraper(
  {
    throwError: true | false default: true,
    noisy: true | false default: false,
    timeout: milliseconds default: 30000,
    maxRetries: 2 default: 0,
    throwTimeoutError: true default: true,
  });
```

A ScrapeTask instance is passed to the Scraper's .scrape method.

A ScrapeTask accepts a url as its first argument. It accepts a number of arrays of tasks to be run on the page returned from the url.

```
const ScrapeTask =
  new ScrapeTask(
  'https://url-to-scrape/',
  [
    'key',
    'selector target',
    Function to be evaluated in browser context,
    Optional function to be called on returned array
  ]
);
```
###Example:

```JavaScript
const { Scraper, ScrapeTask } = require('EvalScraper');

const Scraper = new Scraper(
  {
    throwError: true,
    noisy: false,
    timeout: 60000,
    maxRetries: 2,
    throwTimeoutError: true,
  });


const ScrapeTask =
  new ScrapeTask('https://url-to-scrape/',
  [
    'key',
    'selector target',
    Function to be evaluated in browser context,
    Function to be called on returned array
  ]
);

async function scrapeMeta () {
  try {
    const task = new ScrapeTask('https://news.ycombinator.com/',
      ['firstArticleTitle', '.title', dvs => dvs.map(d => d.textContent), getFirstArticle],
      ['secondArticleTitle', '.title', dvs => dvs.map(d => d.textContent), getFirstArticle]
    );
    const scrape = await scraper.scrape(task);
    return scrape;
  } catch (err) {
    throw new Error(`scrapeMeta: ${err}`);
  }
}

getFri

```
