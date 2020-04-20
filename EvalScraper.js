const puppeteer = require('puppeteer');
const { TimeoutError } = puppeteer.errors;

class Scraper {
  constructor (config) {
    this.throw = config.throwError || true;
    this.noisy = config.noisy || false;
    this.timeout = config.timeout || 30000;
    this.maxRetries = config.maxRetries || 0;
    this.retryCounter = 0;
  }

  async scrape (task) {
    try {
      if (this.retryCounter <= this.maxRetries) {
        if (this.retryCounter > 0) console.log(`Scraper retry attempt #${this.retryCounter}`);
        const container = {};
        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        if (this.noisy) console.log(`Scraper to ${task.url}...`);
        await page.goto(task.url, { timeout: this.timeout });
        for (const [key, target, handler, callback] of task.scrape) {
          let scrape = await page.$$eval(target, handler); // returns an array
          if (this.noisy) console.log(`Scraper got ${key}`);
          if (callback) scrape = callback(scrape);
          container[key] = scrape;
        }
        await browser.close();
        return container;
      } else {
        throw new Error(`Scrape attempts exceeded limit of ${this.maxRetries}`);
      }
    } catch (err) {
      if (err instanceof TimeoutError) {
        // retry scrape
        this.retryCounter++;
        console.log('\x1b[35m%s\x1b[0m', `${err}. Retrying...`);
        const retryScrape = await this.scrape(task);
        this.retryCounter = 0;
        return retryScrape;
      } else {
        if (this.throw === false) return null;
        throw new Error(`Scraper module: ${err}`);
      }
    }
  }
}

class ScrapeTask {
  constructor (url, ...scrapes) {
    this.url = url;
    this.scrape = [];
    for (const scrape of scrapes) {
      this.scrape.push(scrape);
    }
  }
}

exports.Scraper = Scraper;
exports.ScrapeTask = ScrapeTask;
