const ScraperBaseClass = require('../../ScraperBaseClass.js');

class SiteScraperClass extends ScraperBaseClass {
    linkPages = {
        '//world affairs': ['/category/articles/', '/category/videos/'],
    }

    linkSelector = 'h2.post-title a';
    headerSelector = 'h1.post-title.single';
    ingressSelector = 'div.post div p';
    imageSelector = this.emptySelector;

    constructor(messageLogger, errorLogger) {
        super(messageLogger, errorLogger);
        this.siteBaseUrl = "https://www.corbettreport.com"
    }

    getIngressSelector(url, linkedFrom) {
        if(linkedFrom == '/category/articles/'){
            return this.ingressSelector;
        }
        if(linkedFrom == '/category/videos/'){
            return 'div.post div p:nth-of-type(4)';
        }
        return this.ingressSelector;
    }
}

module.exports = SiteScraperClass