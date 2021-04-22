import { ScraperConfig } from "./ScraperConfig";
import puppeteer from "puppeteer";

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
