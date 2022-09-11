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
        console.log('scraper.initialize')
        const scrapeStart = Date.now();
        //disabled FOR DEBUGGING
        //await scraper.initialize();
        const { propertyInfo, invalidUrls } = await scraper.getPropertyInfo();
        const scrapeEnd = Date.now();
        //disabled FOR DEBUGGING
        //await postPropertiesInBatches(propertyInfo, invalidUrls, messageLogger, errorLogger, scrapeStart, scrapeEnd);
        //console.log(propertyInfo)
    }
    catch (error) {
        console.log(error);
    }
    return propertyUrls;
}

/*
exports.postProperties = async (messageLogger, errorLogger) => {
    try {
        const path = __dirname + '/sites';
        const folderContent = fs.readdirSync(path);
        let propertyInfo = [];
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
*/

postPropertiesInBatches = async (propertyInfo, invalidUrls, messageLogger, errorLogger, scrapeStart, scrapeEnd) => {
    //To avoid the chance of posting too much data at once, we split the post up in batches
    const batchSize = 50;

    let ndx = 0;
    messageLogger.logMessage('Posting stories in batches');
    while (propertyInfo[ndx] || invalidUrls[ndx]) {
        messageLogger.logMessage('Posting story batch');
        let propertyInfoBatch = [];
        let invalidUrlsBatch = [];

        for (let batchCounter = 0; batchCounter < batchSize; batchCounter += 1) {
            if (propertyInfo[ndx]) {
                propertyInfoBatch.push(propertyInfo[ndx]);
            }

            if (invalidUrls[ndx]) {
                invalidUrlsBatch.push(invalidUrls[ndx]);
            }
            ndx += 1;
        }
        await api.postBotStories(propertyInfoBatch, invalidUrlsBatch, errorLogger.getErrors(), scrapeStart, scrapeEnd);
    }
}
