const ScraperBaseClass = require('../../ScraperBaseClass.js');
//import {getDomFromUrl} from '../../../utils/domUtils.js'
const domUtils = require('../../../utils/domUtils.js');
const vm = require('vm');

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
    siteBaseUrl = 'https://www.onthemarket.com/';
    maxConnections = 5;
    activeConnections = 0;
    scannedDirCount = 0;
    propertyAreaCount = 0;
    scannedPropertiesCount = 0;
    currentPropertyAreaUrl = undefined;
    propertyPageNumber = 0;
    noMorePropertiesAtCurrentUrl = false;
    dirUrls = {};
    propertyAreaUrls = {};
    propertyAreaUrlPage = {};
    propertyUrls = {};

    getNextDirUrl() {
        const allUrls = Object.keys(this.dirUrls);
        let nextUrl = undefined;
        if (allUrls[0]) {
            nextUrl = allUrls[0];
            delete (this.dirUrls[nextUrl]);
        }
        return nextUrl;
    }

    getNextPropertyAreaUrl() {
        const allUrls = Object.keys(this.propertyAreaUrls);
        let nextUrl = undefined;
        if (allUrls[0]) {
            nextUrl = allUrls[0];
            delete (this.propertyAreaUrls[nextUrl]);
        }

        return nextUrl;
    }

    getNextPropertyAreaUrlPage() {
        /*
         Since each propertyArea can have multiple pages and we scan each page in 
         separate threads we scan separate eareas in each thread to avoid possible
         attempting to connect to several nonexisten pages at one time since we do
         not know how many pages in each area until we get to an empty page
        */

        Object.keys(this.propertyAreaUrlPage).forEach(url => {
            if (this.propertyAreaUrlPage[url].allScanned) {
                delete (this.propertyAreaUrlPage[url]);
            }
        });

        let urlToScan = undefined;
        let pageToScan = undefined;
        Object.keys(this.propertyAreaUrlPage).forEach(url => {
            if (!this.propertyAreaUrlPage[url].beingScanned) {
                urlToScan = url;
                this.propertyAreaUrlPage[urlToScan].panenumber += 1;
            }
        });

        if (typeof urlToScan == 'undefined') {
            urlToScan = this.getNextPropertyAreaUrl();
            if (typeof urlToScan != 'undefined') {
                this.propertyAreaUrlPage[urlToScan] = { beingScanned: false, panenumber: 0, allScanned: false };
            }
        }

        if (typeof urlToScan != 'undefined') {
            this.propertyAreaUrlPage[urlToScan].beingScanned = true;
            pageToScan = this.propertyAreaUrlPage[urlToScan].panenumber;
        }

        const returnObject = { url: urlToScan, extension: '?page=' + pageToScan };
        return returnObject;
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

    async getPropertyUrlsFromPropertyAreaPage(urlInfo) {


        const propertiesPageUrl = urlInfo.url + '?page=' + urlInfo.extension;

        const dom = await domUtils.getDomFromUrl(propertiesPageUrl);
        let addedProperties = 0;

        if (dom) {
            const propertyUrls = this.getPropertyUrlsFromDom(dom);
            Object.keys(propertyUrls).forEach(url => {
                this.propertyUrls[url] = url;
                addedProperties += 1;
            })
        }

        if (addedProperties == 0) {
            this.propertyAreaUrlPage[urlInfo.url].allScanned = true;
        }

        this.scannedPropertiesCount += 1;
        this.activeConnections -= 1;
        this.scanForPropertyUrls();
    }

    scanForPropertyUrls() {
        /*
        We start here when all this.dirUrls have been scanned.
        We now have all propertyAreaUrls with a count of properties for each area in
        this.propertyAreaUrls.
        Each of the urls in this.propertyAreaUrls might have multiple pages with properties.
        We now have to scann all the pages and save the properties in this.propertyUrls
        */
        let urlFound = true;
        while ((this.scannedPropertiesCount <= 10) && (this.activeConnections < this.maxConnections) && (urlFound)) {
            //scan the page for propertyUrls and store them in 
            // this.propertyUrls in a separate 'thread'
            let nextDirUrl = this.getNextPropertyAreaUrlPage();
            if (typeof nextDirUrl.url != 'undefined') {
                this.activeConnections += 1;
                this.getPropertyUrlsFromPropertyAreaPage(nextDirUrl);
            }
            else {
                urlFound = false;
            }
        }
        //if ((this.activeConnections == 0) && (!urlFound)) {
        //FOR DEBUGGING
        if (this.scannedPropertiesCount > 10) {
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
        const dom = await domUtils.getDomFromUrl(dirUrl);
        const { counter, tooMany } = this.getPropertyCountFromDom(dom);
        if (tooMany) {
            //if too many properties listed for this area (typically says +1000)
            //we find all the subareasand store them for scanning in the dirUrls array
            const childDirUrls = this.getChildDirUrlsFromDom(dom);
            Object.keys(childDirUrls).forEach(url => { this.dirUrls[this.siteBaseUrl + url] = this.siteBaseUrl + url })
        }
        else {
            this.propertyAreaUrls[dirUrl] = counter;
            this.propertyAreaCount += 1;
        }
        this.scannedDirCount += 1;
        this.activeConnections -= 1;
        this.scanForSubDirUrls();
    }

    scanForSubDirUrls() {
        let urlFound = true;
        while ((this.propertyAreaCount <= 5) && (this.activeConnections < this.maxConnections) && urlFound) {
            let nextDirUrl = this.getNextDirUrl();
            if (typeof nextDirUrl != 'undefined') {
                this.activeConnections += 1;
                this.getChildDirs(nextDirUrl);
            }
            else {
                urlFound = false;
            }
        }
        //if ((this.activeConnections == 0) && (!urlFound)) {
        //FOR DEBUGGING
        if (this.propertyAreaCount > 5) {
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
        this.dirParser.siteBaseUrl = this.siteBaseUrl;
        const initialUrl = this.siteBaseUrl + this.initialPage;
        this.dirParser.dirUrls[initialUrl] = initialUrl;
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