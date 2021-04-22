"use strict";
var __classPrivateFieldSet =
  (this && this.__classPrivateFieldSet) ||
  function (receiver, privateMap, value) {
    if (!privateMap.has(receiver)) {
      throw new TypeError("attempted to set private field on non-instance");
    }
    privateMap.set(receiver, value);
    return value;
  };
var __classPrivateFieldGet =
  (this && this.__classPrivateFieldGet) ||
  function (receiver, privateMap) {
    if (!privateMap.has(receiver)) {
      throw new TypeError("attempted to get private field on non-instance");
    }
    return privateMap.get(receiver);
  };
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
var _retryCounter, _browser, _scrapeId, _activeScrapes;
Object.defineProperty(exports, "__esModule", { value: true });
exports.Scraper = exports.ScrapeTask = void 0;
const puppeteer_1 = __importDefault(require("puppeteer"));
const chalk_1 = __importDefault(require("chalk"));
class RetryError extends Error {}
class ScraperConfig {
  constructor({
    throwError = true,
    noisy = false,
    timeout = 30000,
    maxRetries = 2,
  } = {}) {
    this.throwError = throwError;
    this.noisy = noisy;
    this.timeout = timeout;
    this.maxRetries = maxRetries;
  }
}
class ScrapeHandler extends ScraperConfig {
  constructor(
    id,
    browser,
    { throwError = true, noisy = false, timeout = 30000, maxRetries = 2 } = {}
  ) {
    super({ throwError, noisy, timeout, maxRetries });
    _retryCounter.set(this, void 0);
    __classPrivateFieldSet(this, _retryCounter, 0);
    this.id = id;
    this.browser = browser;
  }
  async handleScrape(task) {
    try {
      const scrapeId = { id: this.id };
      if (__classPrivateFieldGet(this, _retryCounter) > this.maxRetries) {
        if (this.noisy)
          console.log(
            chalk_1.default.magenta(
              `Exceeded retry limit of ${this.maxRetries}`
            )
          );
        throw new RetryError(`Exceeded retry limit of ${this.maxRetries}`);
      }
      if (__classPrivateFieldGet(this, _retryCounter) > 0 && this.noisy)
        console.log(
          chalk_1.default.magenta(
            `Scraper retry attempt ${__classPrivateFieldGet(
              this,
              _retryCounter
            )}`
          )
        );
      const page = await this.browser.newPage();
      // setting timeout in page.goto config obj seems bugged, set with method instead
      page.setDefaultTimeout(this.timeout);
      if (this.noisy)
        console.log(chalk_1.default.blue(`---> Page open for ${task.url}`));
      await page.goto(task.url, {
        // domcontentloaded for better performance; handles pop up modals
        waitUntil: "domcontentloaded",
      });
      if (this.noisy)
        console.log(chalk_1.default.blue(`Page went to ${task.url}...`));
      const evalTask = await this.evaluateScrapeTasks(
        page,
        task.scrape,
        this.noisy
      );
      const results = { ...scrapeId, ...evalTask };
      await page.close();
      if (this.noisy)
        console.log(chalk_1.default.blue(`<--x Page closed for ${task.url}`));
      return results;
    } catch (err) {
      // all errors eventually route through RetryError
      if (err instanceof RetryError) {
        throw new RetryError(`${err}`);
      } else {
        // retry scrape
        __classPrivateFieldSet(
          this,
          _retryCounter,
          +__classPrivateFieldGet(this, _retryCounter) + 1
        );
        if (this.noisy)
          console.log(chalk_1.default.magenta(`${err}. Retrying...`));
        const results = await this.handleScrape(task);
        __classPrivateFieldSet(this, _retryCounter, 0);
        return results;
      }
    }
  }
  async evaluateScrapeTasks(page, task, noisy) {
    try {
      const results = {};
      for (const [key, target, handler, callback] of task) {
        await page.waitForSelector(target);
        const scrape = await page.$$eval(target, handler); // returns an array
        if (noisy) console.log(chalk_1.default.green(`Scraper got ${key}`));
        const result = callback ? callback(scrape) : scrape;
        results[key] = result;
      }
      return results;
    } catch (err) {
      throw new Error(`Evaluate Scrape Tasks: ${err}`);
    }
  }
}
_retryCounter = new WeakMap();
class ScrapeTask {
  constructor(url, ...scrapes) {
    this.url = url;
    this.scrape = [...scrapes];
  }
}
exports.ScrapeTask = ScrapeTask;
class Scraper extends ScraperConfig {
  constructor({
    throwError = true,
    noisy = false,
    timeout = 30000,
    maxRetries = 2,
  } = {}) {
    super({ throwError, noisy, timeout, maxRetries });
    _browser.set(this, void 0);
    _scrapeId.set(this, void 0);
    _activeScrapes.set(this, void 0);
    __classPrivateFieldSet(this, _scrapeId, 0);
    __classPrivateFieldSet(this, _activeScrapes, []);
    __classPrivateFieldSet(
      this,
      _browser,
      (async () => {
        try {
          __classPrivateFieldSet(
            this,
            _browser,
            await puppeteer_1.default.launch({
              args: ["--no-sandbox"],
            })
          );
          __classPrivateFieldGet(
            this,
            _browser
          ).createIncognitoBrowserContext();
        } catch (err) {
          throw new Error(`browser init ${err}`);
        }
      })()
    );
  }
  async close() {
    await __classPrivateFieldGet(this, _browser).close();
    __classPrivateFieldSet(this, _browser, undefined);
    if (this.noisy) console.log(chalk_1.default.blue("<-x Closed browser"));
  }
  async scrape(task) {
    try {
      await __classPrivateFieldGet(this, _browser);
      if (this.noisy) console.log(chalk_1.default.blue(`Scraping ${task.url}`));
      const scrapeHandler = new ScrapeHandler(
        __classPrivateFieldGet(this, _scrapeId),
        __classPrivateFieldGet(this, _browser),
        {
          throwError: this.throwError,
          noisy: this.noisy,
          timeout: this.timeout,
          maxRetries: this.maxRetries,
        }
      );
      const results = await scrapeHandler.handleScrape(task);
      __classPrivateFieldGet(this, _activeScrapes).pop();
      return results;
    } catch (err) {
      if (this.throwError) throw new Error(`Scraper: ${err}`);
      console.log(chalk_1.default.red(`Scraper: ${err}`));
    }
  }
}
exports.Scraper = Scraper;
(_browser = new WeakMap()),
  (_scrapeId = new WeakMap()),
  (_activeScrapes = new WeakMap());
