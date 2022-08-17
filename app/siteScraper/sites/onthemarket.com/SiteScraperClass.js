const ScraperBaseClass = require('../../ScraperBaseClass.js');
//import {getDomFromUrl} from '../../../utils/domUtils.js'
const domUtils = require('../../../utils/domUtils.js');

class SiteDirectory {
    url = undefined;
    dom = undefined;
    parentDir = undefined;
    propertyCount = undefined;
    propertyCountLimit = 1000;
    childDirectories = [];
    childPropertyUrls = [];

    constructor(url, messageLogger, errorLogger) {
        this.errorLogger = errorLogger;
        this.messageLogger = messageLogger;
        this.url = url;
    }

    getPropertyCountFromDom() {
        const spanSelector = 'span.otm-ResultCount span';
        //const anchors = Array.from(this.dom.window.document.querySelectorAll(spanSelector));
        //console.log(anchors[0].textContent);
        const anchors = this.dom.window.document.querySelector(spanSelector);
        console.log(anchors.textContent);
        
        return 10;
    }

    async initialize() {
        console.log('SiteDirectory.initialize')
        this.dom = await domUtils.getDomFromUrl(this.url);
        if (this.dom) {
            this.messageLogger.logMessage('DOM loaded: ' + this.url);
            this.propertyCount = this.getPropertyCountFromDom();
            if (this.subdirsRequired()) {
                this.childDirectories = this.getChildDirectoriesFromDom();
            }
            else {
                this.childPropertyUrls = this.getDirectChildPropertyUrlsFromDom();
            }
        }
        console.log('SiteDirectory.initialize done')
    }

    /*
    async getDom(url) {
        let response = '';
        let dom;
        try {
            response = await got(url);
            if (this.runScripts) {
                dom = new JSDOM(response.body, { runScripts: "dangerously" });
            }
            else {
                dom = new JSDOM(response.body);
            }
        } catch (error) {
            //console.log(error.response.body);
            this.logError("Error loading from " + url + ":" + error.response.body);
        }
        return dom;
    }
    */

    subdirsRequired() {
        return (this.propertyCount >= this.propertyCountLimit);
    }

    async getDirectChildPropertyUrlsFromDom() {
        const allPropertyUrls = [];
        let propertyUrls = this.getPropertyUrlsFromDom(this.dom);
        propertyUrls.forEach(propertyUrl => { allPropertyUrls.push(propertyUrl) });
        let propertyPageIndex = 1;
        let nextPropertyPageDom = await getDomFromUrl(this.url + '/?page=' + propertyPageIndex);
        while (nextPropertyPageDom) {
            propertyUrls = this.getPropertyUrlsFromDom(nextPropertyPageDom);
            propertyUrls.forEach(propertyUrl => { allPropertyUrls.push(propertyUrl) });
            propertyPageIndex += 1;
            nextPropertyPageDom = await getDomFromUrl(this.url + '/?page=' + propertyPageIndex);
        }
        return allPropertyUrls;
    }

    async getChildDirectoriesFromDom() {
        const childDirUrls = this.getChildDirUrlsFromDom(this.dom);
        for (const childDirUrl of childDirUrls) {
            const childDir = new SiteDirectory(childDirUrl);
            await childDir.initialize();
            childDir.parentDir = this;
            childDirectories.push(childDir);
        }
    }

    getAllChildPropertyUrls() {
        const allChildPropertyUrls = [];
        this.childDirectories.forEach(childDirectory => {
            allChildPropertyUrls.concat(childDirectory.getAllChildPropertyUrls());
        })
        allChildPropertyUrls.concat(this.childPropertyUrls);
        return allChildPropertyUrls;
    }
}

class SiteScraperClass extends ScraperBaseClass {
    siteBaseUrl = 'https://www.onthemarket.com/';
    initialPage = 'for-sale/property/uk/';
    siteDirectory = undefined;

    constructor(messageLogger, errorLogger) {
        super(messageLogger, errorLogger);
        this.siteBaseUrl = "https://www.onthemarket.com/"
    }

    async initialize() {
        console.log('SiteScraperClass.initialize')
        this.siteDirectory = new SiteDirectory(this.siteBaseUrl + this.initialPage, this.messageLogger, this.errorLogger);
        await this.siteDirectory.initialize();
        console.log('SiteScraperClass.initialize done')
    }

    getPropertyUrls() {
        return this.siteDirectory.getAllChildPropertyUrls();
    }
}

module.exports = SiteScraperClass