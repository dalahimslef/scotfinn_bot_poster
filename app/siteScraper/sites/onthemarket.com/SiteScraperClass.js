const ScraperBaseClass = require('../../ScraperBaseClass.js');
//import {getDomFromUrl} from '../../../utils/domUtils.js'
const domUtils = require('../../../utils/domUtils.js');
const vm = require('vm');

/*
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
*/

let scanCompeted = false;
let completedResolve = function () { };

function dirScanFinishedCallback() {
    scanCompeted = true;
    completedResolve();
}

async function awaitCompletion() {
    if (!scanCompeted) {
        await new Promise((resolve) => {
            console.log('waiting...');
            completedResolve = resolve;
        });
    }
    else {
        console.log('no waiting required');
    }
}

function testPromise() {
    setTimeout(dirScanFinishedCallback, 10000);
}

class dirParser {
    maxConnections = 5;
    activeConnections = 0;
    currentPropertyUrl = undefined;
    propertyPageNumber = 0;
    noMorePropertiesAtCurrentUrl = false;
    dirUrls = [];
    propertyUrls = [];

    getNextPropertyUrl() {
        this.currentPropertyUrl = this.propertyUrls.pop();
        this.propertyPageNumber = 0;

        if (!this.currentPropertyUrl) {
            dirScanFinishedCallback();
        }
    }

    getNextpropertyUrlPage() {
        let nextDirUrl = this.currentPropertyUrl;
        nextDirUrl = nextDirUrl + '?page=' + this.propertyPageNumber;
        this.propertyPageNumber += 1;
        return nextDirUrl;
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

    async getPropertyUrls(propertiesPageUrl) {
        this.activeConnections += 1;
        const dom = await domUtils.getDomFromUrl(propertiesPageUrl);
        let addedProperties = 0;

        if (dom) {
            const propertyUrls = this.getPropertyUrlsFromDom(dom);
            Object.keys(propertyUrls).foreach(url => {
                this.propertyUrls.push(url);
                addedProperties += 1;
            })
        }

        if (addedProperties == 0) {
            this.noMorePropertiesAtCurrentUrl = true;
        }

        this.activeConnections -= 1;
        return addedProperties;
    }

    scanForPropertyUrls() {
        this.getNextPropertyUrl();
        let nextDirUrl = this.getNextpropertyUrlPage();
        while ((this.activeConnections < this.maxConnections)
            && (nextDirUrl)) {
            this.getPropertyUrls(nextDirUrl);
            nextDirUrl = this.getNextpropertyUrlPage();
        }
        if ((this.activeConnections == 0) && (typeof nextDirUrl == 'undefined')) {
            this.dirScanFinishedCallback();
        }
    }

    getPropertyCountFromDom(dom) {
        const spanSelector = 'span.otm-ResultCount span';
        const counterTextElement = dom.window.document.querySelector(spanSelector);
        const counter = parseInt(counterTextElement.textContent.replace(/\D/g, ''));
        const plusPos = counterTextElement.textContent.indexOf("+")
        let tooMany = true;
        if (plusPos < 0) {
            tooMany = false;
        }

        return { counter, tooMany };
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

    async getChildDirs(dirUrl) {
        this.activeConnections += 1;
        const dom = await domUtils.getDomFromUrl(dirUrl);
        const { counter, tooMany } = this.getPropertyCountFromDom(dom);
        if (tooMany) {
            //if too many properties listed for this area (typically says +1000)
            //we find all the subareasand store them for scanning in the dirUrls array
            const childDirUrls = this.getChildDirUrlsFromDom(dom);
            Object.keys(childDirUrls).foreach(url => { this.dirUrls.push(url) })
        }
        else {
            this.propertyUrls.push(dirUrl);
        }
        this.activeConnections -= 1;
        this.scanForSubDirUrls();
    }

    scanForSubDirUrls() {
        let nextDirUrl = this.dirUrls.pop();
        while ((this.activeConnections < this.maxConnections)
            && (nextDirUrl)) {
            this.getChildDirs(nextDirUrl);
            nextDirUrl = this.dirUrls.pop();
        }
        if ((this.activeConnections == 0) && (typeof nextDirUrl == 'undefined')) {
            this.scanForPropertyUrls();
        }
    }
}

class SiteScraperClass extends ScraperBaseClass {
    siteBaseUrl = 'https://www.onthemarket.com/';
    siteName = 'www.onthemarket.com';
    initialPage = 'for-sale/property/uk/';
    siteParser = undefined;

    otmContext = undefined;

    constructor(messageLogger, errorLogger) {
        super(messageLogger, errorLogger);
        this.siteBaseUrl = "https://www.onthemarket.com/";
        this.siteName = 'www.onthemarket.com';
    }

    async initialize() {
        /*
        console.log('SiteScraperClass.initialize:' + this.initialPage)
        this.siteParser = new SiteDirectory(this.siteBaseUrl, this.initialPage, this.messageLogger, this.errorLogger, 0);
        await this.siteParser.initialize();
        console.log('SiteScraperClass.initialize done:' + this.initialPage)
        */

        this.dirParser = new dirParser(this.siteBaseUrl, this.initialPage, this.messageLogger, this.errorLogger, 0);
        this.dirParser.dirUrls.push(this.siteBaseUrl + this.initialPage);
        this.dirParser.scanForSubDirUrls();
        //testPromise();
        await awaitCompletion();
        console.log('done');
    }

    initializeOtmObject(propertyDom) {
        try {
            const scripts = Array.from(propertyDom.window.document.querySelectorAll('script'));
            scripts.forEach(script => {
                const textPosition = script.textContent.search('__OTM__.jsonData');
                if (textPosition !== -1) {
                    //console.log(script.textContent);
                    const code = script.textContent;
                    //Initialize the context with a couple of different variables. 
                    //We find that the script will crash if these variables are not defined.
                    //Figured out by trail and error...
                    const newContext = { window: {}, __OTM__: { currentQuery: {} } };
                    vm.createContext(newContext); // Contextify the object.
                    vm.runInContext(code, newContext);
                    this.otmContex = newContext;
                }
            });
        }
        catch (error) {
            this.otmContex = undefined;
            console.log(error);
        }
    }

    getPropertyUrls() {
        //The actual return:
        return this.siteParser.getAllChildPropertyUrls();

        //FOR DEBUGGING
        /*
        return [
            'https://www.onthemarket.com/details/12293040/#/photos',
            'https://www.onthemarket.com/details/12293030/#/photos',
            'https://www.onthemarket.com/details/12293015/#/photos',
            'https://www.onthemarket.com/details/12292989/#/photos',
            'https://www.onthemarket.com/details/12292948/#/photos',
            'https://www.onthemarket.com/details/12292948_invalidurl/#/photos', //invalid url
        ];
        */
    }

    initializePropertyDom(propertyDom) {
        this.initializeOtmObject(propertyDom);
    }

    getFeaturesDivText(propertyDom, searchText) {
        let returnText = '';
        const infoDivs = Array.from(propertyDom.window.document.querySelectorAll('section.otm-IconFeatures div div'));
        infoDivs.forEach(infoDiv => {
            const textPosition = infoDiv.textContent.toLowerCase().search(searchText.toLowerCase());
            if (textPosition !== -1) {
                returnText = infoDiv.textContent.trim();
            }
        });
        return returnText;
    }

    getPropertyTypeFromDom(propertyDom) {
        if (this.otmContex.__OTM__.jsonData && this.otmContex.__OTM__.jsonData['humanised-property-type']) {
            const type = this.otmContex.__OTM__.jsonData['humanised-property-type'];
            if (type.toLowerCase().search('house') !== -1) {
                return 'house';
            }
            if (type.toLowerCase().search('bungalow') !== -1) {
                return 'house';
            }
            if (type.toLowerCase().search('park home') !== -1) {
                return 'house';
            }
            if (type.toLowerCase().search('flat') !== -1) {
                return 'flat';
            }
            if (type.toLowerCase().search('apartment') !== -1) {
                return 'flat';
            }
            if (type.toLowerCase().search('farm') !== -1) {
                return 'farm';
            }
            if (type.toLowerCase().search('land') !== -1) {
                return 'land';
            }
        }
        if (this.getFeaturesDivText(propertyDom, 'house') !== '') {
            return 'house';
        }
        if (this.getFeaturesDivText(propertyDom, 'bungalow') !== '') {
            return 'house';
        }
        if (this.getFeaturesDivText(propertyDom, 'park home') !== '') {
            return 'house';
        }
        if (this.getFeaturesDivText(propertyDom, 'flat') !== '') {
            return 'flat';
        }
        if (this.getFeaturesDivText(propertyDom, 'apartment') !== '') {
            return 'flat';
        }
        if (this.getFeaturesDivText(propertyDom, 'farm') !== '') {
            return 'farm';
        }
        if (this.getFeaturesDivText(propertyDom, 'land') !== '') {
            return 'land';
        }
        return '';
    }

    getSaleTypeFromDom(propertyDom) {
        return ''; // sale, lease
    }

    getPriceFromDom(propertyDom) {
        if (this.otmContex.__OTM__.jsonData && this.otmContex.__OTM__.jsonData['price']) {
            const priceString = this.otmContex.__OTM__.jsonData['price'];
            const price = parseFloat(priceString.replace(/\D/g, ''));
            return price;
        }
        const div = propertyDom.window.document.querySelector('div.otm-Price');
        if (div) {
            const priceString = div.textContent;
            const price = parseFloat(priceString.replace(/\D/g, ''));
            return price;
        }
        return -1;
    }

    getHouseSqmFromDom(propertyDom) {
        const divText = this.getFeaturesDivText(propertyDom, 'sq m');
        const parts = divText.split('/');
        if (parts[1]) {
            const words = parts[1].trim().split(' ');
            if (words[0]) {
                return parseInt(words[0]);
            }
        }
        return -1;
    }

    getLandSqmFromDom(propertyDom) {
        return -1;
    }

    getBedroomCountFromDom(propertyDom) {
        const divText = this.getFeaturesDivText(propertyDom, 'bed');
        const words = divText.split(' ');
        if (words[0]) {
            return parseInt(words[0]);
        }
        return -1;
    }

    getConstructionYearFromDom(propertyDom) {
        return -1;
    }

    getUnformattedAddressFromDom(propertyDom) {
        const div = propertyDom.window.document.querySelector('section.otm-Title.title-details div:nth-of-type(2) div:nth-of-type(2)');
        if (div) {
            const address = div.textContent;
            return address.trim();
        }
        return '';
    }

    /*
    getGetGoogleCoordinatesFromDom(propertyDom) {
        const staticLocationImage = propertyDom.window.document.querySelector('section#property-map img.static-map');
        if (staticLocationImage) {
            const imageSrcString = staticLocationImage.attributes.src.textContent;
            //See https://developers.google.com/maps/documentation/maps-static/start#Markers
            //get Marker parameter from the src-url
            const urlParams = new URLSearchParams(imageSrcString);
            const markers = urlParams.get('Markers');
            if (markers) {
                const markersInfo = markers.split('|');
                if (markersInfo[1]) {
                    const coordinates = markersInfo[1].trim().split(',');
                    if (coordinates[0] && coordinates[1]) {
                        latitude = parseFloat(coordinates[0].trim());
                        longitude = parseFloat(coordinates[1].trim());
                    }
                }
            }
        }
    }
    */

    getGetGoogleLatitudeFromDom(propertyDom) {
        let latitude = -1000;
        if (this.otmContex.__OTM__.jsonData && this.otmContex.__OTM__.jsonData['location']) {
            latitude = parseFloat(this.otmContex.__OTM__.jsonData['location'].lat);
        }
        return latitude;
    }

    getGetGoogleLongitudeFromDom(propertyDom) {
        let longitude = -1000;
        if (this.otmContex.__OTM__.jsonData && this.otmContex.__OTM__.jsonData['location']) {
            longitude = parseFloat(this.otmContex.__OTM__.jsonData['location'].lon);
        }
        return longitude;
    }

    getImageUrlsFromDom(propertyDom) {
        //images are not visible initially. They are loaded using a script. Find the script and 
        //get image urls from there...
        const imageUrls = [];
        if (this.otmContex.__OTM__.jsonData && this.otmContex.__OTM__.jsonData['images']) {
            this.otmContex.__OTM__.jsonData['images'].forEach(image => {
                imageUrls.push({ large: image['large-url'], preview: image['url'] });
            });
        }
        return imageUrls;
    }

    getAgentFromDom(propertyDom) {
        const agentInfo = { name: '', logo_url: '', website: '', email: '', phone: '' };
        if (this.otmContex.__OTM__.jsonData && this.otmContex.__OTM__.jsonData['agent']) {
            if (this.otmContex.__OTM__.jsonData['agent']['company_name']) {
                agentInfo.name = this.otmContex.__OTM__.jsonData['agent']['company_name'];
            }
            if (this.otmContex.__OTM__.jsonData['agent']['display-logo'] && this.otmContex.__OTM__.jsonData['agent']['display-logo']['url']) {
                agentInfo.logo_url = this.otmContex.__OTM__.jsonData['agent']['display-logo']['url'];
            }
            if (this.otmContex.__OTM__.jsonData['agent']['website-url']) {
                agentInfo.website = this.otmContex.__OTM__.jsonData['agent']['website-url'];
            }
            if (this.otmContex.__OTM__.jsonData['agent']['telephone']) {
                agentInfo.phone = this.otmContex.__OTM__.jsonData['agent']['telephone'];
            }
        }

        return agentInfo;
    }
}

module.exports = SiteScraperClass