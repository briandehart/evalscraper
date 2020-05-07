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
      if (this.retryCounter > this.maxRetries) {
        throw new Error(`Scrape attempts exceeded limit of ${this.maxRetries}`);
      }
      if (this.retryCounter > 0) console.log(`Scraper retry attempt #${this.retryCounter}`);
      const container = {};
      const browser = await puppeteer.launch();
      if (this.noisy) console.log(`--> Puppeteer launched for ${task.url}`);
      const page = await browser.newPage();
      await page.goto(task.url, { timeout: this.timeout });
      if (this.noisy) console.log(`Scraper went to ${task.url}...`);
      // evaluate scrape tasks
      for (const [key, target, handler, callback] of task.scrape) {
        let scrape = await page.$$eval(target, handler); // returns an array
        if (this.noisy) console.log(`Scraper got ${key}`);
        if (callback) scrape = callback(scrape);
        container[key] = scrape;
      }
      await browser.close();
      if (this.noisy) console.log(`<-x Puppeteer closed for ${task.url}`);
      return container;
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

// A ScrapeTasks's first parameter is the url to scrape. 
// Then follow one or more arrays, each containing elements 
// for a scrape of that url.
//
// const task =
// new ScrapeTask(
// 'https://url-to-scrape/',
// [
//   'key',
//   'selector', 
//   pageFunction(selectors), // passed an array containing all instances 
                              // of 'selector' found on the page
//   callback(array) | Optional // called on an array returned by pageFunction
// ],
// ...[Next scrape] | Optional
// );
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
