const fs = require('fs')
const api = require('../api/api.js');



getRandomInt = (min, max) => {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

exports.testScraper = async (sitename, messageLogger, errorLogger) => {
    let propertyUrls = [];
    try {
        const elementPath = __dirname + '/sites/' + sitename;
        const SiteScraper = require(elementPath + '/SiteScraperClass.js');
        const scraper = new SiteScraper(messageLogger, errorLogger);
        await scraper.initialize();
        propertyUrls = await scraper.getPropertyUrls();
    }
    catch (error) {
        console.log(error);
    }
    return propertyUrls;
}

exports.postProperties = async (messageLogger, errorLogger) => {
    try {
        const path = __dirname + '/sites';
        const folderContent = fs.readdirSync(path);
        let storyInfo = [];
        for (const elementName of folderContent) {
            if (elementName.substr(0, 1) != '_') {
                const elementPath = path + '/' + elementName;
                if (fs.lstatSync(elementPath).isDirectory()) {
                    const SiteScraper = require(elementPath + '/SiteScraperClass.js');
                    const scraper = new SiteScraper(messageLogger, errorLogger);
                    let storyUrls = await scraper.getProperties();
                }
            }
        }
    }
    catch (error) {
        let message = error;
        if (error.message) {
            message = error.message;
        }
        errorLogger.logError("Some uncaught error in postStories function:" + message);
    }
}
