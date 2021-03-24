const puppeteer = require("puppeteer");
const { TimeoutError } = puppeteer.errors;
class ScrapeTask {
    constructor(url, ...scrapes) {
        this.url = url;
        this.scrape = [...scrapes];
    }
}
class Scraper {
    constructor({ throwError = true, noisy = false, timeout = 30000, maxRetries = 2, } = {}) {
        this.throwError = throwError;
        this.noisy = noisy;
        this.timeout = timeout;
        this.maxRetries = maxRetries;
        this.retryCounter = 0;
    }
    async scrape(task) {
        try {
            if (this.retryCounter > this.maxRetries) {
                if (this.throwError)
                    throw new Error(`Scrape attempts exceeded limit of ${this.maxRetries}`);
                else
                    return null;
            }
            if (this.retryCounter > 0 && this.noisy)
                console.log(`Scraper retry attempt ${this.retryCounter}`);
            const browser = await puppeteer.launch();
            if (this.noisy)
                console.log(`--> Puppeteer launched for ${task.url}`);
            const page = await getPage(browser, task.url, this.noisy, this.timeout);
            const results = await evaluateScrapeTasks(page, task.scrape, this.noisy);
            await browser.close();
            if (this.noisy)
                console.log(`<-x Puppeteer closed for ${task.url}`);
            return results;
        }
        catch (err) {
            if (err instanceof TimeoutError) {
                this.retryCounter++;
                if (this.noisy)
                    console.log("\x1b[35m%s\x1b[0m", `${err}. Retrying...`);
                const retryScrape = await this.scrape(task);
                this.retryCounter = 0;
                return retryScrape;
            }
            else {
                if (this.throwError)
                    throw new Error(`Scraper: ${err}`);
                return null;
            }
        }
        async function getPage(browser, url, noisy, timeout) {
            try {
                const page = await browser.newPage();
                page.on("error", (err) => {
                    console.log("\x1b[35m%s\x1b[0m", `Page: ${err}`);
                });
                await page.goto(url, {
                    timeout,
                    waitUntil: "domcontentloaded",
                });
                if (noisy)
                    console.log(`Scraper went to ${url}...`);
                return page;
            }
            catch (err) {
                throw new Error(`Page: ${err}`);
            }
        }
        async function evaluateScrapeTasks(page, task, noisy) {
            try {
                const results = {};
                for (const [key, target, handler, callback] of task) {
                    await page.waitForSelector(target);
                    let scrape = await page.$$eval(target, handler);
                    if (noisy)
                        console.log(`Scraper got ${key}`);
                    if (callback)
                        scrape = callback(scrape);
                    results[key] = scrape;
                }
                return results;
            }
            catch (err) {
                throw new Error(`Evaluate Scrape Tasks: ${err}`);
            }
        }
    }
}
exports.Scraper = Scraper;
exports.ScrapeTask = ScrapeTask;
