const ist = require("ist");
const { stdout, sterr } = require("test-console");
const { Scraper, ScrapeTask } = require("../evalscraper.js");

const defaultScraper = new Scraper();

const nonDefaultScraper = new Scraper({
  throwError: false,
  noisy: true,
  timeout: 60000,
  maxRetries: 0,
});

const noisyScraper = new Scraper({
  throwError: true,
  noisy: true,
  timeout: 30000,
  maxRetries: 2,
});

const quietScraper = new Scraper({
  throwError: false,
  noisy: false,
  timeout: 30000,
  maxRetries: 2,
});

const timeoutScraper = new Scraper({
  throwError: true,
  noisy: false,
  timeout: 1, // raise Timeout Error
  maxRetries: 2,
});

const quietTimeoutScraper = new Scraper({
  throwError: false,
  noisy: false,
  timeout: 1, // raise Timeout Error
  maxRetries: 2,
});

const task = new ScrapeTask("http://127.0.0.1:8080", [
  "target",
  "p",
  (paragraphs) =>
    paragraphs.map((p) => {
      const parag = [];
      parag.push(p.textContent);
      return parag;
    }),
]);

const taskError = new ScrapeTask("http://127.0.0.1:8080", [
  "target",
  "span", // element not found
  (paragraphs) =>
    paragraphs.map((p) => {
      const parag = [];
      parag.push(p.textContent);
      return parag;
    }),
]);

const taskCallback = new ScrapeTask("http://127.0.0.1:8080", [
  "target",
  "p",
  (paragraphs) =>
    paragraphs.map((p) => {
      const parag = [];
      parag.push(p.textContent);
      return parag;
    }),
  (paragraphs) => paragraphs.map((p) => p[0].toUpperCase()),
]);

const targetText = "target";
const numSelectors = 2;

describe("Scraper", () => {
  describe("constructor", () => {
    it("intitializes with a default throwError property of true", () => {
      ist(defaultScraper.throwError, true);
    });
    it("intitializes with a default noisy property of false", () => {
      ist(defaultScraper.noisy, false);
    });
    it("intitializes with a default timeout property of 30000", () => {
      ist(defaultScraper.timeout, 30000);
    });
    it("intitializes with a default maxRetries property of 2", () => {
      ist(defaultScraper.maxRetries, 2);
    });
    it("configures a throwError property", () => {
      ist(nonDefaultScraper.throwError, false);
    });
    it("configures a noisy property", () => {
      ist(nonDefaultScraper.noisy, true);
    });
    it("configures a timeout property", () => {
      ist(nonDefaultScraper.timeout, 60000);
    });
    it("configures a maxRetries property", () => {
      ist(nonDefaultScraper.maxRetries, 0);
    });
  });
  it("returns an object with a property name taken from the scrape task", async () => {
    const testScrape = await quietScraper.scrape(task);
    ist(Object.getOwnPropertyNames(testScrape)[0], task.scrape[0][0]);
  });
  it("selects all targetted selectors on the page", async () => {
    const testScrape = await quietScraper.scrape(task);
    ist(numSelectors, testScrape.target.length);
  });
  it("evaluates a function on a selector in browser context", async () => {
    const testScrape = await quietScraper.scrape(task);
    ist(Array.isArray(testScrape.target));
  });
  it("calls a callback function on returned value", async () => {
    const testScrape = await quietScraper.scrape(taskCallback);
    ist(testScrape.target[1], "TARGET");
  });
  it("logs progress when noisy", async () => {
    const inspect = stdout.inspect();
    const testScrape = await noisyScraper.scrape(task);
    inspect.restore();
    ist(inspect.output.length > 0);
  });
  it("suppresses logs when quiet", async () => {
    const inspect = stdout.inspect();
    const testScrape = await quietTimeoutScraper.scrape(task);
    inspect.restore();
    ist(inspect.output.length === 0);
  });
  it("throws Timeout errors when throwError is set to true", () => {
    const scrapeFn = async () => await quietTimeoutScraper.scrape(task);
    ist.throws(scrapeFn());
  });
  it("suppresses errors and returns null when throwError is set to false", async () => {
    const testScrape = await quietTimeoutScraper.scrape(taskError);
    ist(testScrape, null);
  });
  it("retries the scrape on error limited to Scraper.maxRetries");
  it("configures puppeteer timeouts");
});
