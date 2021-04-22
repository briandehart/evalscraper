import { ScraperConfig } from "./ScraperConfig";
import { ScrapeTask } from "./ScrapeTask";
import { Browser, Page } from "puppeteer";
import chalk from "chalk";

export class ScrapeHandler extends ScraperConfig {
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
