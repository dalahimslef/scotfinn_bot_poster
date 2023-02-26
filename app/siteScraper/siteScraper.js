const fs = require('fs')
const api = require('../api/api.js');
const objectSaver = require('../utils/objectSaver.js');
const AsyncExec = require('../utils/asyncExec.js');



getRandomInt = (min, max) => {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

exports.testScraper = async (sitename, messageLogger, errorLogger) => {
    await api.deleteBotMessages();
    let propertyUrls = [];
    try {
        const elementPath = __dirname + '/sites/' + sitename;
        scrapeSite(elementPath, messageLogger, errorLogger);
    }
    catch (error) {
        if (error.message) {
            console.log(error.message);
        }
        else {
            console.log(error);
        }
    }
    return propertyUrls;
}


exports.postProperties = async (messageLogger, errorLogger) => {
    try {
        await api.deleteBotMessages();
        const path = __dirname + '/sites';
        const folderContent = fs.readdirSync(path);
        let propertyInfo = [];
        for (const elementName of folderContent) {
            if (elementName.substr(0, 1) != '_') {
                const elementPath = path + '/' + elementName;
                if (fs.lstatSync(elementPath).isDirectory()) {
                    scrapeSite(elementPath, messageLogger, errorLogger);
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

postProperties = async (propertyInfo, scrapeStart, scrapeEnd) => {
    const batchSize = 10;

    let ndx = 0;
    messageLogger.logMessage('Posting properties in batches');
    while (propertyInfo[ndx] || invalidUrls[ndx]) {
        messageLogger.logMessage('Posting property batch');
        let propertyInfoBatch = [];
        let invalidUrlsBatch = [];

        for (let batchCounter = 0; batchCounter < batchSize; batchCounter += 1) {
            if (propertyInfo[ndx]) {
                propertyInfoBatch.push(propertyInfo[ndx]);
            }


            ndx += 1;
        }
        await api.postBotProperties(propertyInfo, scrapeStart, scrapeEnd);
    }
}

postPropertiesInBatches = async (propertyInfo, invalidUrls, messageLogger, errorLogger, scrapeStart, scrapeEnd) => {
    //To avoid the chance of posting too much data at once, we split the post up in batches
    const batchSize = 10;

    let ndx = 0;
    messageLogger.logMessage('Posting properties in batches');
    while (propertyInfo[ndx] || invalidUrls[ndx]) {
        messageLogger.logMessage('Posting property batch');
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
        await api.postBotProperties(propertyInfoBatch, invalidUrlsBatch, errorLogger.getErrors(), scrapeStart, scrapeEnd);
    }
}

getPropertiesToLoadAndDelete = (allPropertyUrls, existingPropertyUrls) => {
    const propertiesToLoad = [];
    const propertiyUrlsToDelete = [];
    const nonexistentProperties = {};

    Object.keys(existingPropertyUrls).forEach(url => {
        nonexistentProperties[url] = url;
    })

    for (let propertyUrl of allPropertyUrls) {
        if (nonexistentProperties[propertyUrl]) {
            delete nonexistentProperties[propertyUrl];
        }
        if (!existingPropertyUrls[propertyUrl]) {
            propertiesToLoad.push(propertyUrl);
        }
    }

    Object.keys(nonexistentProperties).forEach(url => {
        propertiyUrlsToDelete.push(url);
    })
    return { propertiesToLoad, propertiyUrlsToDelete };
}

function testPromise(syncExecutor) {
    console.log(syncExecutor.klassename);
    setTimeout(syncExecutor.dirScanFinishedCallback.bind(syncExecutor), 10000);
}

scrapeSite = async (elementPath, messageLogger, errorLogger) => {
    try {

        const ae = new AsyncExec();
        //ae.dirScanFinishedCallback();
        testPromise(ae);
        await ae.awaitCompletion();
        const SiteScraper = require(elementPath + '/SiteScraperClass.js');
        const scraper = new SiteScraper(messageLogger, errorLogger);
        console.log('scraper.initialize')
        const scrapeStart = Date.now();
        //disable FOR DEBUGGING
        //await scraper.initialize();

        const existingPropertyUrls = await scraper.getExistingProperties();
        //const allPropertyUrls = await this.getPropertyUrls();
        const allPropertyUrls = require('../utils/propertyUrls.js');
        //objectSaver.saveObjectToFile(propertyUrls, "C:\\Users\\dalah\\Programming\\node-programs\\scotfinn\\bot_poster\\app\\utils\\propertyUrls.txt");

        const { propertiesToLoad, propertiyUrlsToDelete } = getPropertiesToLoadAndDelete(allPropertyUrls, existingPropertyUrls);

        let loopCounter = 0;
        const batchSize = 10;
        let propertyUrls = [];
        for (let i = 0; i < batchSize; i += 1) {
            const nextUrl = propertiesToLoad.pop();
            if (nextUrl) {
                propertyUrls.push(nextUrl);
            }
        }
        while (propertyUrls.length > 0) {

            const { propertyInfo, invalidUrls } = await scraper.getPropertyInfo(propertyUrls);
            //for debugging
            //const { propertyInfo, invalidUrls, propertiyUrlsToDelete } = await scraper._debug_getPropertyInfo();
            const scrapeEnd = Date.now();
            let filename = "C:\\Users\\dalah\\Programming\\node-programs\\scotfinn\\bot_poster\\app\\utils\\propertyInfo_" + loopCounter + ".js"
            objectSaver.saveObjectToFile(propertyInfo, filename);
            //disable FOR DEBUGGING

            //await postPropertiesInBatches(propertyInfo, invalidUrls, messageLogger, errorLogger, scrapeStart, scrapeEnd);
            await api.postBotProperties(propertyInfo, scrapeStart, scrapeEnd);
            //console.log(propertyInfo)


            propertyUrls = [];
            for (let i = 0; i < batchSize; i += 1) {
                const nextUrl = propertiesToLoad.pop();
                if (nextUrl) {
                    propertyUrls.push(nextUrl);
                }
            }

            loopCounter += 1;
        }

        await api.deleteProperties(propertiyUrlsToDelete, scraper.siteName);

        const allMessages = [];
        let messages = messageLogger.getMessages();
        messages.forEach(msg => { allMessages.push({ message: msg, type: 'message' }); });
        messages = errorLogger.getErrors();
        messages.forEach(msg => { allMessages.push({ message: msg, type: 'error' }); });
        await api.postBotMessages(allMessages);
    }
    catch (error) {
        throw error;
    }
}
