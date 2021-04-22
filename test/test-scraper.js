import { Scraper, ScrapeTask } from "../dist/evalscraper.mjs";
import ist from "ist";
import find from "find-process";
import shelljs from "shelljs";
import * as testConsole from "test-console";
let { stdout } = testConsole;
let moduleType = "ES6";

if (process.env.COMMON) {
  ({ Scraper, ScrapeTask } = require("../dist/evalscraper.js"));
  ist = require("ist");
  ({ stdout } = require("test-console"));
  moduleType = "CommonJS";
}

const nonDefaultScraperConfig = {
  throwError: false,
  noisy: true,
  timeout: 60000,
  maxRetries: 0,
};

const noisyScraperConfig = {
  throwError: false,
  noisy: true,
  timeout: 1000,
  maxRetries: 1,
};

const quietScraperConfig = {
  throwError: false,
  noisy: false,
  timeout: 1000,
  maxRetries: 3,
};

const errorScraperConfig = {
  throwError: true,
  noisy: false,
  timeout: 1000,
  maxRetries: 1,
};

// const noisyErrorScraperConfig = {
//   throwError: true,
//   noisy: true,
//   timeout: 1000,
//   maxRetries: 1,
// };

const task = new ScrapeTask("http://127.0.0.1:8080", [
  "target_id",
  "p#target_id",
  (pgraphs) =>
    pgraphs.map((p) => {
      const pgraph = [];
      pgraph.push(p.textContent);
      return pgraph;
    }),
]);

const errorTask = new ScrapeTask("http://127.0.0.1:8080", [
  "target_id",
  "span", // element will not be found
  (pgraphs) =>
    pgraphs.map((p) => {
      const pgraph = [];
      pgraph.push(p.textContent);
      return pgraph;
    }),
]);

const callbackTask = new ScrapeTask("http://127.0.0.1:8080", [
  "target_id",
  "p#target_id",
  (pgraphs) =>
    pgraphs.map((p) => {
      const pgraph = [];
      pgraph.push(p.textContent);
      return pgraph;
    }),
  (pgraphs) => pgraphs.map((p) => p[0].toUpperCase()),
]);

const twoTargetTask = new ScrapeTask(
  "http://127.0.0.1:8080",
  [
    "target_id",
    "p#target_id",
    (pgraphs) =>
      pgraphs.map((p) => {
        const pgraph = [];
        pgraph.push(p.textContent);
        return pgraph;
      }),
    (pgraphs) => pgraphs.map((p) => p[0].toUpperCase()),
  ],
  [
    "target_class",
    "p.target_class",
    (pgraphs) =>
      pgraphs.map((p) => {
        const pgraph = [];
        pgraph.push(p.textContent);
        return pgraph;
      }),
    (pgraphs) => pgraphs.map((p) => p[0].toUpperCase()),
  ]
);

const defaultScraper = new Scraper();
const nonDefaultScraper = new Scraper(nonDefaultScraperConfig);
const quietScraper = new Scraper(quietScraperConfig);
const noisyScraper = new Scraper(noisyScraperConfig);
const errorScraper = new Scraper(errorScraperConfig);

// make sure no chrome processes will polute tests
shelljs.exec("pkill chrome");

describe(`Scraper ${moduleType}`, () => {
  describe("constructor", async () => {
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
    ist(testScrape.target_id[0], task.scrape[0][0]);
  });
  it("selects all targeted selectors on the page", async () => {
    const testScrape = await quietScraper.scrape(task);
    ist(1, testScrape.target_id.length);
  });
  it("evaluates a function on a selector in browser context", async () => {
    const testScrape = await quietScraper.scrape(task);
    ist(Array.isArray(testScrape.target_id));
  });
  it("calls a callback function on returned value", async () => {
    const testScrape = await quietScraper.scrape(callbackTask);
    ist(testScrape.target_id[0], "TARGET_ID"); // callback toUpperCase()
  });
  it("logs progress when noisy is set to true", async () => {
    const inspect = stdout.inspect();
    await noisyScraper.scrape(task);
    inspect.restore();
    ist(inspect.output.length > 0);
  });
  it("suppresses logs when noisy is set to false and no errors are thrown", async () => {
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
  // FIXME: don't test for err.message
  it("retries the scrape on TimeoutError", async () => {
    // shelljs.exec("pkill chrome");
    try {
      await errorScraper.scrape(errorTask);
      throw new Error("Test did not throw");
    } catch (err) {
      if (
        err.message === "Test did not throw" ||
        !err.message.includes("Exceeded retry limit")
      )
        throw new Error(err);
    }
  });
  it("configures puppeteer timeouts correctly", async () => {
    // shelljs.exec("pkill chrome");
    const inspect = stdout.inspect();
    await noisyScraper.scrape(errorTask);
    inspect.restore();
    const logs = inspect.output.filter((logMessage) =>
      logMessage.includes("1000ms")
    );
    if (logs.length === 0) throw new Error();
  });

  it("handles multiple Scrapers (with errors; will return values from non-error scrapers)", async () => {
    try {
      const scrapers = await Promise.all(
        Array(3).fill(new Scraper(quietScraperConfig))
      );
      const results = await Promise.all(
        scrapers.map(async (scraper, i) =>
          i === 0 ? scraper.scrape(errorTask) : scraper.scrape(task)
        )
      );
      // scrapers.forEach(
      //   await Promise.all(
      //     scrapers.map(async (scraper) => await scraper.close())
      //   )
      // );
      results.forEach((scrape, i) =>
        i === 0
          ? ist(scrape === undefined)
          : ist(scrape.target_id[0][0] === "target_id")
      );
    } catch (err) {
      if (!err.message.includes("Scrape attempts exceeded limit"))
        throw new Error(err);
    }
  });
  it("handles one instance of Scraper with multiple async scrapes (with errors; will return values from non-error scrapers)", async () => {
    try {
      const targetTasksNum = 3;
      const errorTasksNum = 2;
      const scraper = new Scraper(quietScraperConfig);
      const tasks = Array(targetTasksNum).fill(twoTargetTask);
      const errorTasks = Array(errorTasksNum).fill(errorTask);
      const allTasks = tasks.concat(errorTasks);
      let results = await Promise.all(
        allTasks.map(async (task) => scraper.scrape(task))
      );
      results = await Promise.all(
        allTasks.map(async (task) => scraper.scrape(task))
      );
      await scraper.close();
      // results = await Promise.all(
      //   allTasks.map(async (task) => scraper.scrape(task))
      // );
      // results = await Promise.all(
      //   allTasks.map(async (task) => scraper.scrape(task))
      // );
      ist(
        targetTasksNum,
        results.filter((result) => {
          if (result) return result.target_id[0] === "TARGET_ID";
          else return false;
        }).length
      );
      ist(
        targetTasksNum,
        results.filter((result) => {
          if (result) return result.target_class[0] === "TARGET_CLASS";
          else return false;
        }).length
      );
      ist(
        errorTasksNum,
        results.filter((result) => result === undefined).length
      );
    } catch (err) {
      if (!err.message.includes("Scrape attempts exceeded limit"))
        throw new Error(err);
    }
  });
  it("cleans up zombie processes on error (one Scraper instance, multiple scrapes)", async () => {
    try {
      // prevent pollution from other tests
      shelljs.exec("pkill chrome");
      const quietScraper = new Scraper(quietScraperConfig);
      const tasks = [errorTask, task];
      await Promise.all(tasks.map((t) => quietScraper.scrape(t)));
      await quietScraper.close();
      // shelljs.exec("pkill chrome");
    } catch (err) {
      if (
        err.message === "Test did not throw" ||
        !err.message.includes("Scrape attempts exceeded limit")
      )
        throw new Error(err);
    } finally {
      const list = await find("name", "puppeteer");
      if (list.length) throw new Error(`Puppeteer process running`);
    }
  });
});
