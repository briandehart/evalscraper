const ist = require('ist');
const { Scraper, ScrapeTask } = require('../evalscraper.js');

const scraper = new Scraper(
  {
    throwError: true,
    noisy: true,
    timeout: 30000,
    maxRetries: 2,
    throwTimeoutError: true,
  });

// returns the titles and links of the first ten Hacker News stories
const newsScrape =
  new ScrapeTask('https://news.ycombinator.com/',
  [
    'stories',
    'a.storylink',
    anchors => anchors.map(a => {
      const story = [];
      story.push(a.textContent);
      story.push(a.href)
      return story;
    }),
    anchors => anchors.slice(0, 10)
  ],
);

async function logStories (scrapeTask) {
  try {
    const hackerNews = await scraper.scrape(scrapeTask);
    hackerNews.stories.forEach(story => console.log(story[0], story[1], '\n'));
  } catch (err) {
    throw new Error(err);
  }
}

describe('Scraper', () => {
  // it('launches puppeteer');
  // it('opens a new browser page');
  // it('opens a url in the browser page (ScrapeTask.url)');
  it('selects a selector on the page (ScrapeTask.scrape[1])');
  it('evaluates a function (ScrapeTask.scrape[2]) on a selector on the page (ScrapeTask.scrape[1]) in browser context');
  it('calls a callback function (ScrapeTask.scrape[3] on returned array');
  it('returns an object.property equal to ScrapeTask.scrape[0]');
  it('returns an array in object.property');
  it('retries the scrape on error limited to Scraper.maxRetries');
  it('throws an error');
  it('suppresses errors');
  it('logs progress');
  it('configures puppeteer timeouts');
});