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
        const allPropertyUrls = {};
        let propertyUrls = this.getPropertyUrlsFromDom(this.dom);
        let morePropertiesAdded = false;
        Object.keys(propertyUrls).forEach(key => {
            if (!allPropertyUrls[key]) {
                allPropertyUrls[key] = propertyUrls[key];
                morePropertiesAdded = true;
            }
        });
        //propertyUrls.forEach(propertyUrl => { allPropertyUrls.push(propertyUrl) });
        let propertyPageIndex = 1; 
        while (morePropertiesAdded) {
            let nextPropertyPageDom = await domUtils.getDomFromUrl(this.url + '/?page=' + propertyPageIndex);
            propertyUrls = this.getPropertyUrlsFromDom(nextPropertyPageDom);
            morePropertiesAdded = false;
            Object.keys(propertyUrls).forEach(key => {
                if (!allPropertyUrls[key]) {
                    allPropertyUrls[key] = propertyUrls[key];
                    morePropertiesAdded = true;
                }
            });
            propertyPageIndex += 1;
        }
        return allPropertyUrls;
    }

    getPropertyUrlsFromDom(dom) {
        const propertyUrsl = {};
        const anchorSelector = 'li.otm-PropertyCard a';
        const anchors = Array.from(dom.window.document.querySelectorAll(anchorSelector));

        anchors.forEach(anchor => {
            const href = anchor.attributes.href.textContent.replace(/^\/|\/$/g, '');//trim any first or last slashes
            console.log(href);
            if (href.substring(0, 8) == 'details/') {
                propertyUrsl[href] = href;
            }
        });

        return propertyUrsl;
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