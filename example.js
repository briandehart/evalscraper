const { Scraper, ScrapeTask } = require("./dist/evalscraper");

const scraper = new Scraper({
  throwError: true,
  noisy: true,
  timeout: 30000,
  maxRetries: 2,
});

// returns the titles and links of
// the first ten Hacker News stories
const newsScrape = new ScrapeTask("https://news.ycombinator.com/", [
  "stories",
  "a.storylink",
  (anchors) =>
    anchors.map((a) => {
      const story = [];
      story.push(a.textContent);
      story.push(a.href);
      return story;
    }),
  (stories) => stories.slice(0, 10),
]);

async function logStories(scrapeTask) {
  try {
    const hackerNews = await scraper.scrape(scrapeTask);
    hackerNews.stories.forEach((story) =>
      console.log(story[0], story[1], "\n")
    );
    scraper.close();
  } catch (err) {
    console.log(err);
  }
}

logStories(newsScrape);
