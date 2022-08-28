const ScraperBaseClass = require('../../ScraperBaseClass.js');
//import {getDomFromUrl} from '../../../utils/domUtils.js'
const domUtils = require('../../../utils/domUtils.js');

class SiteDirectory {
    siteBaseUrl = undefined;
    path = undefined;
    url = undefined;
    dom = undefined;
    parentDir = undefined;
    propertyCount = undefined;
    subdirsRequired = undefined;
    propertyCountLimit = 1000;
    childDirectories = [];
    childPropertyUrls = [];
    childDirUrls = undefined;
    messageLogger = undefined;
    depth = undefined;

    constructor(siteBaseUrl, path, messageLogger, errorLogger, depth) {
        this.errorLogger = errorLogger;
        this.messageLogger = messageLogger;
        this.siteBaseUrl = siteBaseUrl;
        this.path = path;
        this.url = siteBaseUrl + path;
        this.depth = depth;
    }

    getPropertyCountFromDom() {
        const spanSelector = 'span.otm-ResultCount span';
        const counterTextElement = this.dom.window.document.querySelector(spanSelector);
        const counter = parseInt(counterTextElement.textContent.replace(/\D/g, ''));
        const plusPos = counterTextElement.textContent.indexOf("+")
        let tooMany = true;
        if (plusPos < 0) {
            tooMany = false;
        }

        return { counter, tooMany };
    }

    async initialize() {
        this.printDebugText('SiteDirectory.initialize:' + this.path)
        this.dom = await domUtils.getDomFromUrl(this.url);
        if (this.dom) {
            this.messageLogger.logMessage('DOM loaded: ' + this.url);
            let countFromDom = this.getPropertyCountFromDom();
            this.propertyCount = countFromDom.counter;
            this.subdirsRequired = countFromDom.tooMany;
            // if (this.subdirsRequired && this.depth < 1) {
            if (this.subdirsRequired) {
                this.childDirectories = await this.getChildDirectoriesFromDom();
            }
            else {
                this.childPropertyUrls = await this.getDirectChildPropertyUrlsFromDom();
                this.printDebugText('properties:' + this.propertyCount);
            }
        }
        this.printDebugText('SiteDirectory.initialize done:' + this.path)
    }

    printDebugText(debugText) {
        let text = '';
        for (let i = 0; i < this.depth; i += 1) {
            text = text + '    ';
        }
        text = text + debugText;
        console.log(text);
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
        //while (morePropertiesAdded && propertyPageIndex < 2) {
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
        const propertyUrls = {};
        const anchorSelector = 'li.otm-PropertyCard a';
        const anchors = Array.from(dom.window.document.querySelectorAll(anchorSelector));

        anchors.forEach(anchor => {
            const href = anchor.attributes.href.textContent.replace(/^\/|\/$/g, '');//trim any first or last slashes
            if (href.substring(0, 8) == 'details/') {
                propertyUrls[href] = href;
            }
        });

        return propertyUrls;
    }

    getChildDirUrlsFromDom(dom) {
        const childDirUrls = {};
        const anchorSelector = 'div.within li.otm-ListItemOtmBullet a';
        const anchors = Array.from(dom.window.document.querySelectorAll(anchorSelector));

        anchors.forEach(anchor => {
            const href = anchor.attributes.href.textContent.replace(/^\/|\/$/g, '');//trim any first or last slashes
            childDirUrls[href] = href;
        });

        return childDirUrls;
    }

    async getChildDirectoriesFromDom() {
        const childDirs = [];
        const childDirUrls = this.getChildDirUrlsFromDom(this.dom);
        for (const childDirUrl of Object.keys(childDirUrls)) {
            const childDir = new SiteDirectory(this.siteBaseUrl, childDirUrl, this.messageLogger, this.errorLogger, this.depth + 1);
            await childDir.initialize();
            childDir.parentDir = this;
            childDirs.push(childDir);
        }
        return childDirs;
    }

    getAllChildPropertyUrls() {
        let allChildPropertyUrls = [];
        Object.keys(this.childPropertyUrls).forEach(key => {
            allChildPropertyUrls.push(this.childPropertyUrls[key]);
        })
        this.childDirectories.forEach(childDirectory => {
            allChildPropertyUrls = allChildPropertyUrls.concat(childDirectory.getAllChildPropertyUrls());
        })
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
        console.log('SiteScraperClass.initialize:' + this.initialPage)
        this.siteDirectory = new SiteDirectory(this.siteBaseUrl, this.initialPage, this.messageLogger, this.errorLogger, 0);
        await this.siteDirectory.initialize();
        console.log('SiteScraperClass.initialize done:' + this.initialPage)
    }

    getPropertyUrls() {
        return this.siteDirectory.getAllChildPropertyUrls();
    }
}

module.exports = SiteScraperClass