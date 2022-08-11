const ScraperBaseClass = require('../../ScraperBaseClass.js');

class SiteDirectory {
    dom = undefined;
    parentDir = undefined;
    childDirs = [];
}

class SiteScraperClass extends ScraperBaseClass {
    siteBaseUrl = 'https://www.onthemarket.com/';
    initialPage = 'for-sale/property/uk/';
    currentPropertyListPage = undefined;
    currentPropertyPage = undefined;
    allPropertyListPagesRead = false;
    allPropertyPagesRead = false;
    siteDirectory = undefined;

    constructor(messageLogger, errorLogger) {
        super(messageLogger, errorLogger);
        this.siteBaseUrl = "https://www.onthemarket.com/"
    }

    async initialize() {
        this.siteDirectory = new SiteDirectory();
        this.siteDirectory.dom = await this.getDom(this.siteBaseUrl + this.initialPage);
    }

    async loadSiteDirectory(url) {
        const sd = new SiteDirectory();
        sd.dom = await this.getDom(url);
        return sd;
    }

    async getNextPropertyListPage() {
        if (!currentPropertyListPage && !allPropertyListPagesRead) {
            //we are starting
            this.currentPropertyListPage = this.getDom(this.siteBaseUrl + this.initialPage)
        }
        //onthemarket.com only lists up to a 1000 properties for the selected area. If there are more than 1000 properties
        //found, we have to slect a smaller area by selecting a "sub url" on the page
    }

    async getNextPropertyPage() {

    }
}

module.exports = SiteScraperClass