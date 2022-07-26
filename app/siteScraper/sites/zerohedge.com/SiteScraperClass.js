const ScraperBaseClass = require('../../ScraperBaseClass.js');

class SiteScraperClass extends ScraperBaseClass {
    linkPages = {
        '//world affairs': ['/'],
    }

    linkSelector = 'main.main-content h2 a';
    headerSelector = 'main.main-content h1';
    ingressSelector = 'main.main-content p';
    imageSelector = 'main.main-content article div:nth-of-type(3) img';

    constructor(messageLogger, errorLogger) {
        super(messageLogger, errorLogger);
        this.siteBaseUrl = "https://www.zerohedge.com"
    }
}

module.exports = SiteScraperClass