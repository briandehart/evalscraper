import puppeteer from "puppeteer";
import { Browser, Page } from "puppeteer";
// checking err instanceof TimeoutError doesn't work with ESM
// const { TimeoutError } = puppeteer.errors;

type Scrape = [
  // property to hold the returned value of this scrape
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

  constructor(url: string, ...scrapes: Scrape[]) {
    this.url = url;
    this.scrape = [...scrapes];
  }
}

export class Scraper {
  throwError: boolean;
  noisy: boolean; // when true, progress is logged to console
  timeout: number;
  maxRetries: number;
  retryCounter: number;

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
    this.retryCounter = 0;
  }

  async scrape(task: ScrapeTask): Promise<ScrapeResults | null> {
    try {
      if (this.retryCounter > this.maxRetries) {
        if (this.throwError)
          throw new Error(
            `Scrape attempts exceeded limit of ${this.maxRetries}`
          );
        else return null;
      }
      if (this.retryCounter > 0 && this.noisy)
        console.log(`Scraper retry attempt ${this.retryCounter}`);
      const browser: Browser = await puppeteer.launch();
      if (this.noisy) console.log(`--> Puppeteer launched for ${task.url}`);
      const page = await getPage(browser, task.url, this.noisy, this.timeout);
      const results = await evaluateScrapeTasks(page, task.scrape, this.noisy);
      await browser.close();
      if (this.noisy) console.log(`<-x Puppeteer closed for ${task.url}`);
      return results;
    } catch (err) {
      // checking err instanceof TimeoutError doesn't work
      if (err.message.includes("TimeoutError")) {
        // retry scrape
        this.retryCounter++;
        if (this.noisy) console.log("\x1b[35m%s\x1b[0m", `${err}. Retrying...`);
        const retryScrape = await this.scrape(task);
        this.retryCounter = 0;
        return retryScrape;
      } else {
        if (this.throwError) throw new Error(`Scraper: ${err}`);
        else console.log(`Scraper: ${err}`);
        return null;
      }
    }

    async function getPage(
      browser: Browser,
      url: string,
      noisy: boolean,
      timeout: number
    ): Promise<Page> {
      try {
        const page: Page = await browser.newPage();
        // throwing an error here causes UnhandledPromiseRejectionWarning
        page.on("error", (err: string) => {
          console.log("\x1b[35m%s\x1b[0m", `Page: ${err}`);
        });
        // setting timeout in page.goto config obj is bugged, set with method instead
        page.setDefaultTimeout(timeout);
        await page.goto(url, {
          waitUntil: "domcontentloaded",
        });
        if (noisy) console.log(`Scraper went to ${url}...`);
        return page;
      } catch (err) {
        throw new Error(`Page: ${err}`);
      }
    }

    async function evaluateScrapeTasks(
      page: Page,
      task: Scrape[],
      noisy: boolean
    ): Promise<ScrapeResults> {
      try {
        const results: ScrapeResults = {};
        for (const [key, target, handler, callback] of task) {
          await page.waitForSelector(target);
          const scrape: string[] = await page.$$eval(target, handler); // returns an array
          if (noisy) console.log(`Scraper got ${key}`);
          const result: unknown = callback ? callback(scrape) : scrape;
          results[key] = result;
        }
        return results;
      } catch (err) {
        throw new Error(`Evaluate Scrape Tasks: ${err}`);
      }
    }
  }
}
