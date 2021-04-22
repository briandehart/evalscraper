import puppeteer from "puppeteer";
import { Browser, Page } from "puppeteer";
import chalk from "chalk";

type Scrape = [
  // property name in Scraper.scrape()'s returned object;
  // it holds the returned value of this scrape
  key: string,

  // element to select on page
  selector: string,

  // a functon passed an array containing all
  // instances of 'selector' found on the page;
  // pageFunction evaluates in browser context
  pageFunction: (
    elements: Element[],
    ...args: unknown[]
  ) => string[] | Promise<string[]>,

  // Optional callback that is passed an
  // array returned by pageFunction
  callback?: (scrape: string[]) => unknown
];

interface ScrapeResults {
  [key: string]: unknown;
}

export class ScrapeTask {
  url: string;
  scrape: Scrape[];
  id?: number;

  constructor(url: string, ...scrapes: Scrape[]) {
    this.url = url;
    this.scrape = [...scrapes];
  }
}

class RetryError extends Error {}

abstract class ScraperConfig {
  throwError: boolean;
  noisy: boolean; // when true, progress is logged to console
  timeout: number;
  maxRetries: number;

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
  #retryCounter: number;
  id: number;
  browser: Browser;

  constructor(
    id: number,
    browser: Browser,
    { throwError = true, noisy = false, timeout = 30000, maxRetries = 2 } = {}
  ) {
    super({ throwError, noisy, timeout, maxRetries });
    this.#retryCounter = 0;
    this.id = id;
    this.browser = browser;
  }

  async handleScrape(task: ScrapeTask): Promise<any> {
    try {
      const scrapeId = { id: this.id };
      if (this.#retryCounter > this.maxRetries) {
        if (this.noisy)
          console.log(
            chalk.magenta(`Exceeded retry limit of ${this.maxRetries}`)
          );
        throw new RetryError(`Exceeded retry limit of ${this.maxRetries}`);
      }
      if (this.#retryCounter > 0 && this.noisy)
        console.log(
          chalk.magenta(`Scraper retry attempt ${this.#retryCounter}`)
        );
      const page: Page = await this.browser.newPage();
      // setting timeout in page.goto config obj seems bugged, set with method instead
      page.setDefaultTimeout(this.timeout);
      if (this.noisy) console.log(chalk.blue(`---> Page open for ${task.url}`));
      await page.goto(task.url, {
        // domcontentloaded for better performance; handles pop up modals
        waitUntil: "domcontentloaded",
      });
      if (this.noisy) console.log(chalk.blue(`Page went to ${task.url}...`));
      const evalTask = await this.evaluateScrapeTasks(
        page,
        task.scrape,
        this.noisy
      );
      const results = { ...scrapeId, ...evalTask };
      await page.close();
      if (this.noisy)
        console.log(chalk.blue(`<--x Page closed for ${task.url}`));
      return results;
    } catch (err) {
      // all errors eventually route through RetryError
      if (err instanceof RetryError) {
        throw new RetryError(`${err}`);
      } else {
        // retry scrape
        this.#retryCounter++;
        if (this.noisy) console.log(chalk.magenta(`${err}. Retrying...`));
        const results = await this.handleScrape(task);
        this.#retryCounter = 0;
        return results;
      }
    }
  }

  async evaluateScrapeTasks(
    page: Page,
    task: Scrape[],
    noisy: boolean
  ): Promise<ScrapeResults> {
    try {
      const results: ScrapeResults = {};
      for (const [key, target, handler, callback] of task) {
        await page.waitForSelector(target);
        const scrape: string[] = await page.$$eval(target, handler); // returns an array
        if (noisy) console.log(chalk.green(`Scraper got ${key}`));
        const result: unknown = callback ? callback(scrape) : scrape;
        results[key] = result;
      }
      return results;
    } catch (err) {
      throw new Error(`Evaluate Scrape Tasks: ${err}`);
    }
  }
}

export class Scraper extends ScraperConfig {
  #browser: any;
  #scrapeId: number;
  #activeScrapes: any[];

  constructor({
    throwError = true,
    noisy = false,
    timeout = 30000,
    maxRetries = 2,
  } = {}) {
    super({ throwError, noisy, timeout, maxRetries });
    this.#scrapeId = 0;
    this.#activeScrapes = [];
    this.#browser = (async () => {
      try {
        this.#browser = await puppeteer.launch({
          args: ["--no-sandbox"],
        });
        this.#browser.createIncognitoBrowserContext();
      } catch (err) {
        throw new Error(`browser init ${err}`);
      }
    })();
  }

  async close() {
    await this.#browser!.close();
    this.#browser = undefined;
    if (this.noisy) console.log(chalk.blue("<-x Closed browser"));
  }

  async scrape(task: ScrapeTask): Promise<ScrapeResults | null | undefined> {
    try {
      await this.#browser;
      if (this.noisy) console.log(chalk.blue(`Scraping ${task.url}`));
      const scrapeHandler = new ScrapeHandler(this.#scrapeId, this.#browser!, {
        throwError: this.throwError,
        noisy: this.noisy,
        timeout: this.timeout,
        maxRetries: this.maxRetries,
      });
      const results = await scrapeHandler.handleScrape(task);
      this.#activeScrapes.pop();
      return results;
    } catch (err) {
      if (this.throwError) throw new Error(`Scraper: ${err}`);
      console.log(chalk.red(`Scraper: ${err}`));
    }
  }
}
