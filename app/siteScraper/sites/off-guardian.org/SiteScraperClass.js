const ScraperBaseClass = require('../../ScraperBaseClass.js');

class SiteScraperClass extends ScraperBaseClass {
    linkPages = {
        '//world affairs': ['/media-watch/', '/politics/', '/brave-new-world/'],
        '//opinions': ['/outside-the-overton-window/'],
        '//art and culture': ['/arts-culture/'],
        '//history': ['/historical-perspectives/'],
    }

    linkSelector = 'h3.post-title a';
    headerSelector = 'div.before-post h1.post-title span.the-title';
    ingressSelector = 'div.before-post h1.post-title span.subtitle';
    imageSelector = 'div.post_page-content.post a img';

    constructor(messageLogger, errorLogger) {
        super(messageLogger, errorLogger);
        this.siteBaseUrl = "https://off-guardian.org/"
    }
}

module.exports = SiteScraperClass