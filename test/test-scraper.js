import { Scraper, ScrapeTask } from "../dist/evalscraper.mjs";
import ist from "ist";
import * as testConsole from "test-console";
let { stdout } = testConsole;
let moduleType = "ES6";

if (process.env.COMMON) {
  ({ Scraper, ScrapeTask } = require("../dist/evalscraper.js"));
  ist = require("ist");
  ({ stdout } = require("test-console"));
  moduleType = "CommonJS";
}

const defaultScraper = new Scraper();
// defaults
// throwError: true,
// noisy: false,
// timeout: 30000,
// maxRetries: 2,

const nonDefaultScraper = new Scraper({
  throwError: false,
  noisy: true,
  timeout: 60000,
  maxRetries: 0,
});

const noisyScraper = new Scraper({
  throwError: false,
  noisy: true,
  timeout: 1000,
  maxRetries: 1,
});

const quietScraper = new Scraper({
  throwError: false,
  noisy: false,
  timeout: 1000,
  maxRetries: 1,
});

const errorScraper = new Scraper({
  throwError: true,
  noisy: false,
  timeout: 1000,
  maxRetries: 1,
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

const errorTask = new ScrapeTask("http://127.0.0.1:8080", [
  "target",
  "span", // element will not be found
  (paragraphs) =>
    paragraphs.map((p) => {
      const parag = [];
      parag.push(p.textContent);
      return parag;
    }),
]);

const callbackTask = new ScrapeTask("http://127.0.0.1:8080", [
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
    const testScrape = await quietScraper.scrape(callbackTask);
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
  it("throws errors when throwError is set to true", async () => {
    try {
      await errorScraper.scrape(errorTask);
      throw new Error("Test did not throw");
    } catch (err) {
      if (err.message === "Test did not throw") throw new Error();
    }
  });
  it("suppresses errors when throwError is set to false", async () => {
    await quietScraper.scrape(errorTask);
  });
  it("returns null when throwError is set to false", async () => {
    const testScrape = await quietScraper.scrape(errorTask);
    ist(testScrape, null);
  });
  it("retries the scrape on TimeoutError", async () => {
    try {
      await errorScraper.scrape(errorTask);
      throw new Error("Test did not throw");
    } catch (err) {
      if (
        err.message === "Test did not throw" ||
        !err.message.includes("Scrape attempts exceeded limit")
      )
        throw new Error(err);
    }
  });
  it("configures puppeteer timeouts correctly", async () => {
    const inspect = stdout.inspect();
    await noisyScraper.scrape(errorTask);
    inspect.restore();
    const logs = inspect.output.filter((logMessage) =>
      logMessage.includes("1000ms")
    );
    if (logs.length === 0) throw new Error();
  });
});
