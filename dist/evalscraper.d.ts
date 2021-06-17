declare type Scrape = [
    key: string,
    selector: string,
    pageFunction: (elements: Element[], ...args: unknown[]) => string[] | Promise<string[]>,
    callback?: (scrape: string[]) => unknown
];
interface ScrapeResults {
    [key: string]: unknown;
}
declare abstract class ScraperConfig {
    throwError: boolean;
    noisy: boolean;
    timeout: number;
    maxRetries: number;
    constructor({ throwError, noisy, timeout, maxRetries, }?: {
        throwError?: boolean | undefined;
        noisy?: boolean | undefined;
        timeout?: number | undefined;
        maxRetries?: number | undefined;
    });
}
export declare class ScrapeTask {
    url: string;
    scrape: Scrape[];
    id?: number;
    constructor(url: string, ...scrapes: Scrape[]);
}
export declare class Scraper extends ScraperConfig {
    #private;
    constructor({ throwError, noisy, timeout, maxRetries, }?: {
        throwError?: boolean | undefined;
        noisy?: boolean | undefined;
        timeout?: number | undefined;
        maxRetries?: number | undefined;
    });
    close(): Promise<void>;
    scrape(task: ScrapeTask): Promise<ScrapeResults | null | undefined>;
}
export {};
