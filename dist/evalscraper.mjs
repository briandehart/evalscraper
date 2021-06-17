var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _ScrapeHandler_retryCounter, _Scraper_browser, _Scraper_scrapeId, _Scraper_activeScrapes;
import puppeteer from "puppeteer";
import chalk from "chalk";
class RetryError extends Error {
}
class ScraperConfig {
    constructor({ throwError = true, noisy = false, timeout = 30000, maxRetries = 2, } = {}) {
        this.throwError = throwError;
        this.noisy = noisy;
        this.timeout = timeout;
        this.maxRetries = maxRetries;
    }
}
class ScrapeHandler extends ScraperConfig {
    constructor(id, browser, { throwError = true, noisy = false, timeout = 30000, maxRetries = 2 } = {}) {
        super({ throwError, noisy, timeout, maxRetries });
        _ScrapeHandler_retryCounter.set(this, void 0);
        __classPrivateFieldSet(this, _ScrapeHandler_retryCounter, 0, "f");
        this.id = id;
        this.browser = browser;
    }
    async handleScrape(task) {
        try {
            const scrapeId = { id: this.id };
            if (__classPrivateFieldGet(this, _ScrapeHandler_retryCounter, "f") > this.maxRetries) {
                if (this.noisy)
                    console.log(chalk.magenta(`Exceeded retry limit of ${this.maxRetries}`));
                throw new RetryError(`Exceeded retry limit of ${this.maxRetries}`);
            }
            if (__classPrivateFieldGet(this, _ScrapeHandler_retryCounter, "f") > 0 && this.noisy)
                console.log(chalk.magenta(`Scraper retry attempt ${__classPrivateFieldGet(this, _ScrapeHandler_retryCounter, "f")}`));
            const page = await this.browser.newPage();
            // setting timeout in page.goto config obj seems bugged, set with method instead
            page.setDefaultTimeout(this.timeout);
            if (this.noisy)
                console.log(chalk.blue(`---> Page open for ${task.url}`));
            await page.goto(task.url, {
                // domcontentloaded for better performance; handles pop up modals
                waitUntil: "domcontentloaded",
            });
            if (this.noisy)
                console.log(chalk.blue(`Page went to ${task.url}...`));
            const evalTask = await this.evaluateScrapeTasks(page, task.scrape, this.noisy);
            const results = { ...scrapeId, ...evalTask };
            await page.close();
            if (this.noisy)
                console.log(chalk.blue(`<--x Page closed for ${task.url}`));
            return results;
        }
        catch (err) {
            // all errors eventually route through RetryError
            if (err instanceof RetryError) {
                throw new RetryError(`${err}`);
            }
            else {
                // retry scrape
                __classPrivateFieldSet(this, _ScrapeHandler_retryCounter, +__classPrivateFieldGet(this, _ScrapeHandler_retryCounter, "f") + 1, "f");
                if (this.noisy)
                    console.log(chalk.magenta(`${err}. Retrying...`));
                const results = await this.handleScrape(task);
                __classPrivateFieldSet(this, _ScrapeHandler_retryCounter, 0, "f");
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
                if (noisy)
                    console.log(chalk.green(`Scraper got ${key}`));
                const result = callback ? callback(scrape) : scrape;
                results[key] = result;
            }
            return results;
        }
        catch (err) {
            throw new Error(`Evaluate Scrape Tasks: ${err}`);
        }
    }
}
_ScrapeHandler_retryCounter = new WeakMap();
export class ScrapeTask {
    constructor(url, ...scrapes) {
        this.url = url;
        this.scrape = [...scrapes];
    }
}
export class Scraper extends ScraperConfig {
    constructor({ throwError = true, noisy = false, timeout = 30000, maxRetries = 2, } = {}) {
        super({ throwError, noisy, timeout, maxRetries });
        _Scraper_browser.set(this, void 0);
        _Scraper_scrapeId.set(this, void 0);
        _Scraper_activeScrapes.set(this, void 0);
        __classPrivateFieldSet(this, _Scraper_scrapeId, 0, "f");
        __classPrivateFieldSet(this, _Scraper_activeScrapes, [], "f");
        __classPrivateFieldSet(this, _Scraper_browser, (async () => {
            try {
                __classPrivateFieldSet(this, _Scraper_browser, await puppeteer.launch({
                    args: ["--no-sandbox"],
                }), "f");
                __classPrivateFieldGet(this, _Scraper_browser, "f").createIncognitoBrowserContext();
            }
            catch (err) {
                throw new Error(`browser init ${err}`);
            }
        })(), "f");
    }
    async close() {
        await __classPrivateFieldGet(this, _Scraper_browser, "f").close();
        __classPrivateFieldSet(this, _Scraper_browser, undefined, "f");
        if (this.noisy)
            console.log(chalk.blue("<-x Closed browser"));
    }
    async scrape(task) {
        try {
            await __classPrivateFieldGet(this, _Scraper_browser, "f");
            if (this.noisy)
                console.log(chalk.blue(`Scraping ${task.url}`));
            const scrapeHandler = new ScrapeHandler(__classPrivateFieldGet(this, _Scraper_scrapeId, "f"), __classPrivateFieldGet(this, _Scraper_browser, "f"), {
                throwError: this.throwError,
                noisy: this.noisy,
                timeout: this.timeout,
                maxRetries: this.maxRetries,
            });
            const results = await scrapeHandler.handleScrape(task);
            __classPrivateFieldGet(this, _Scraper_activeScrapes, "f").pop();
            return results;
        }
        catch (err) {
            if (this.throwError)
                throw new Error(`Scraper: ${err}`);
            if (this.noisy)
                console.log(chalk.red(`Scraper: ${err}`));
        }
    }
}
_Scraper_browser = new WeakMap(), _Scraper_scrapeId = new WeakMap(), _Scraper_activeScrapes = new WeakMap();
