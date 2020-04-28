# EvalScraper

EvalScraper is middleware for scraping web pages with Google Puppeteer.

### Installation

    npm install evalscraper

### Usage

Create a ScrapeTask and pass it to a Scraper's ```.scrape``` method. A promise is returned. It resolves to an object with key: value pairs based on the ScrapeTask. 

A ScrapeTasks's first parameter is the url to scrape. Then follow one or more arrays, each containing elements for a scrape of that url.

    const ScrapeTask =
      new ScrapeTask(
      'https://url-to-scrape/',
      [
        'key',
        'selector target',
        Function to be evaluated in browser context,
        Callback function to be called on returned array | Optional
      ],
      ...[Next scrape] | Optional
    );


A Scraper instance can be configured by passing it an optional object at creation.

    const Scraper = new Scraper(
      {
        throwError: true (default) | false,
        noisy: true | false (default), // logs ScrapeTask's progress
        timeout: milliseconds (default: 30000),
        maxRetries: number (default: 0),
        throwTimeoutError: true (default) | false,
      });


### Example

Scrape Hacker News and return the titles and links of the first ten stories.

```JavaScript
const { Scraper, ScrapeTask } = require('EvalScraper');

const scraper = new Scraper(
  {
    throwError: true,
    noisy: true,
    timeout: 30000,
    maxRetries: 2,
    throwTimeoutError: true,
  });

// returns the titles and links of 
// the first ten Hacker News stories
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

logStories(newsScrape);
```
