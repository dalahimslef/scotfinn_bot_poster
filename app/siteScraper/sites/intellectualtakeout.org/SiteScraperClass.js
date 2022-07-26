const ScraperBaseClass = require('../../ScraperBaseClass.js');

class SiteScraperClass extends ScraperBaseClass {
    linkPages = {
        '//world affairs': [
            '/education/',
            '/politics/',
            '/western-civilization/',
            '/economics/',
            '/international/',
        ],
        '//opinions': ['/family/'],
        '//art and culture': ['/culture/', '/literature/'],
        '//history': ['/history/'],
        '//entertainment': ['/entertainment/'],
        '//technology': ['/science/'],
        '//philosophy': ['/philosophy/'],
        '//religion': ['/religion/'],
    }

    linkSelector = 'div.content h3.title a';
    headerSelector = 'div.article-main h1';
    ingressSelector = 'div.article-body p';
    imageSelector = 'div.article-main div.article-image img';

    constructor(messageLogger, errorLogger) {
        super(messageLogger, errorLogger);
        this.siteBaseUrl = "https://www.intellectualtakeout.org/"
    }
}

module.exports = SiteScraperClass