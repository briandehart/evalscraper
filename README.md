# evalscraper

evalscraper is middleware for scraping web pages with [Google Puppeteer](https://developers.google.com/web/tools/puppeteer).

### Installation

    npm install evalscraper

### Usage

Create a ScrapeTask and pass it to a Scraper's ```.scrape``` method. ```.scrape``` returns a promise that resolves to an object with key: value pairs determined by the ScrapeTask. 

A ScrapeTasks's first parameter is the url of the page to scrape. Then follow one or more arrays, each containing elements for a scrape of that page. 

    const task =
      new ScrapeTask(
      'https://url-to-scrape/',
      [
        'key',
        'selector', 
        pageFunction(selectors), // passed an array containing all instances 
                                 // of 'selector' found on the page
        callback(array) | Optional // passed the array returned by pageFunction
      ],
      ...[Next scrape] | Optional
    );

 ```pageFunction``` evaluates in the browser context.

A Scraper instance can be configured by passing it an optional object at creation.

    const scraper = new Scraper(
      {
        throwError: true (default) | false,
        noisy: true | false (default), // logs ScrapeTask's progress to console
        timeout: milliseconds (default: 30000),
        maxRetries: number (default: 0),
        throwTimeoutError: true (default) | false,
      });


### Example

Scrape [Hacker News](https://news.ycombinator.com/) and return the titles and links of the first ten stories.

```JavaScript
const { Scraper, ScrapeTask } = require('evalscraper');

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
    stories => stories.slice(0, 10)
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
