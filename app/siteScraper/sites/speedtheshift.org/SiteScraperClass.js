const ScraperBaseClass = require('../../ScraperBaseClass.js');

class SiteScraperClass extends ScraperBaseClass {
    linkPages = {
        '//world affairs': ['/'],
    }

    subSelectors = {
        '/': {
            '//world affairs/red pill': ['div#column-3 div.drudge_link_posts a'],
            '//world affairs/fringe': ['div#column-3 div.drudge_col_posts a']
        },
    }

    linkSelector = 'a';
    headerSelector = 'h1.the-title';
    ingressSelector = this.emptySelector;
    imageSelector = 'div.main-content div div div div div a img';

    constructor(messageLogger, errorLogger) {
        super(messageLogger, errorLogger);
        this.siteBaseUrl = "https://speedtheshift.org/"
    }

    async getStoryUrlsAndCategory() {
        const storyUrls = [];
        const unfilteredUrls = await super.getStoryUrlsAndCategory();
        unfilteredUrls.forEach(unfilteredUrl => {
            if ((unfilteredUrl.url.substr(0, this.siteBaseUrl.length + 1) == this.siteBaseUrl + '2') && (unfilteredUrl.url.split('/').length > 6)) {
                storyUrls.push(unfilteredUrl);
            }
        })
        return storyUrls;
    }
}

module.exports = SiteScraperClass