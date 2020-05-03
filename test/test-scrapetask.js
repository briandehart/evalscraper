const ist = require('ist');
const { Scraper, ScrapeTask } = require('../evalscraper.js');

describe('ScaperTask', () => {
  it('returns an object with a .url property with a string value', () => {
    let task = new ScrapeTask('http://url');
    ist(task.url, 'http://url');
  });
  it('returns an object with a .scrape property with an array value', () => {
    let task = new ScrapeTask('http://url',
      ['key', 'div', 'divs => divs.map(dv => dv)']);
    ist(task.scrape.isArray());
  })
})