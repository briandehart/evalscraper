# evalscraper

evalscraper is middleware for scraping web pages with [Google Puppeteer](https://developers.google.com/web/tools/puppeteer).

### Installation

```console
npm install evalscraper
```

### Usage

Create a new `Scraper` instance.

```JavaScript
const scraper = new Scraper();
```

A `ScrapeTask`'s first parameter is the url of the page to scrape. Then follow one or more arrays, each containing elements for a scrape of that page. `pageFunction` evaluates in browser context.

```JavaScript
const scrapeTask =
  new ScrapeTask(
    'https://url-to-scrape/',
    [
      'key',                   // property to hold returned value of this scrape

      'selector',              // element to select on page

      pageFunction(selectors), // a functon passed an array containing all
                               // instances of 'selector' found on the page;
                               // pageFunction evaluates in browser context

      callback(array)          // Optional callback that is passed an
                               // array returned by pageFunction
    ],
    // ...[Next scrape]
);
```

Pass the `ScrapeTask` to the`.scrape()` method. It returns a `Promise` that resolves to an object with `key: value` pairs determined by the `ScrapeTask`.

```JavaScript
const scrapeOfPage = await scraper.scrape(scrapeTask);
```

Close the scraper.

```JavaScript
await scraper.close();
```

### Configuration

A `Scraper` instance can be configured by passing an object to the constructor.

```JavaScript
  const scraper = new Scraper(
    {
      // default values
      throwError: true,
      noisy: false, // when true, progress is logged to console
      timeout: 30000,
      maxRetries: 2
    });
```

### Example

Scrape [Hacker News](https://news.ycombinator.com/) and return the titles and links of the first ten stories.

```JavaScript
const { Scraper, ScrapeTask } = require('evalscraper');

const scraper = new Scraper(
  {
    throwError: true,
    noisy: false,
    timeout: 30000,
    maxRetries: 2
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
    scraper.close()
  } catch (err) {
    console.log(err);
  }
}

logStories(newsScrape);
```
