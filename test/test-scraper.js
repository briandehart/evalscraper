import ist, { throws } from "ist";
import * as testConsole from "test-console";
let { stdout, sterr } = testConsole;
import { Scraper, ScrapeTask } from "../dist/evalscraper.mjs";
let moduleType = "ES6";

if (process.env.COMMON) {
  ist, ({ throws } = require("ist"));
  ({ stdout, sterr } = require("test-console"));
  ({ Scraper, ScrapeTask } = require("../dist/evalscraper.js"));
  moduleType = "CommonJS";
}

console.log(Scraper.modType);

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
  timeout: 1000,
  maxRetries: 2,
});

const quietScraper = new Scraper({
  throwError: false,
  noisy: false,
  timeout: 1000,
  maxRetries: 2,
});

const timeoutScraper = new Scraper({
  throwError: true,
  noisy: false,
  timeout: 2,
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

const numSelectors = 2;

describe(`Scraper ${moduleType}`, () => {
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
  it("logs progress when noisy is set to true", async () => {
    const inspect = stdout.inspect();
    await noisyScraper.scrape(task);
    inspect.restore();
    ist(inspect.output.length > 0);
  });
  it("suppresses logs when noisy is set to false", async () => {
    const inspect = stdout.inspect();
    await quietScraper.scrape(task);
    inspect.restore();
    ist(inspect.output.length === 0);
  });
  // it("suppresses errors and returns null when throwError is set to false", async () => {
  //   const testScrape = await quietScraper.scrape(taskError);
  //   ist(testScrape, null);
  // });
  it("throws Timeout errors when throwError is set to true", (done) => {
    const scrapeFn = async () => await timeoutScraper.scrape(task);
    ist.throws(scrapeFn());
    done();
  });
  it("throws Timeout errors when throwError is set to true");
  it("retries the scrape on error limited to Scraper.maxRetries");
  it("configures puppeteer timeouts");
});
