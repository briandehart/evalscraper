export abstract class ScraperConfig {
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
