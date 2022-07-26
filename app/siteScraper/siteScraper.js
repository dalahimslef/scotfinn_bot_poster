const categoryUtils = require("../utils/categories");
const debugStories = require("../utils/debugStories");
const fs = require('fs')
const api = require('../api/api.js');

//const ErrorLoggerClass = require("../utils/ErrorLoggerClass.js");
//const errorLogger = new ErrorLoggerClass();
let errorLogger;

removeAllreadyPostedStories = (storyUrls, postedUrls) => {
    const unusedUrls = [];
    storyUrls.forEach(storyUrl => {
        if (!postedUrls.includes(storyUrl.url)) {
            unusedUrls.push(storyUrl);
        }
    });
    return unusedUrls;
}

setCategryIdOnStories = async (stories, categoriesInfo) => {
    const returnStories = [];
    stories.forEach(story => {
        if (categoriesInfo[story.category]) {
            story.categoryId = categoriesInfo[story.category];
            returnStories.push(story);
        }
        else {
            errorLogger.logError("Nonexistent category:" + story.category);
        }
    })
    return returnStories;
}

getRandomInt = (min, max) => {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

getPosterAndChannelFromCategoryId = (botUsers, categoryId, categoryName) => {
    let selectedPosterId;
    let selectedChannelId;
    const availablePosters = [];
    botUsers.forEach(botUser => {
        if (botUser.postsInCategories.includes(categoryId)) {
            availablePosters.push(botUser);
        }
    });
    if (availablePosters.length == 0) {
        errorLogger.logError("No botusers posts in" + categoryName);
    }
    else {
        const selectedIndex = getRandomInt(0, availablePosters.length - 1);
        selectedPosterId = availablePosters[selectedIndex].user_id;
        selectedChannelId = availablePosters[selectedIndex].channel_id;
    }
    return { selectedPosterId, selectedChannelId };
}

setPosterAndChannelOnStories = (storyInfo, botUsers) => {
    storyInfo.forEach((story, index) => {
        const posterAndChannel = getPosterAndChannelFromCategoryId(botUsers, story.categoryId, story.category);
        storyInfo[index].posterId = posterAndChannel.selectedPosterId;
        storyInfo[index].channelId = posterAndChannel.selectedChannelId;
    });
}

sanitizeStories = (storyInfo) => {
    const sanitizedStories = [];
    const invalidUrls = [];
    storyInfo.forEach((story, index) => {
        let valid = true;
        story.header = story.header.trim();
        story.ingress = story.ingress.trim();

        if (story.header == '') {
            valid = false;
            errorLogger.logError("Empty header:" + story.url);
        }
        if (!story.posterId) {
            valid = false;
            errorLogger.logError("Empty posterId:" + story.url);
        }
        if (!story.channelId) {
            valid = false;
            errorLogger.logError("Empty channelId:" + story.url);
        }
        //if (story.imageUrl.substr(0, 4) != 'http' && story.imageUrl.trim() != '') {
        if ((story.imageUrl.trim !== '') && (story.imageUrl.substr(0, 4) != 'http')) {
            valid = false;
            errorLogger.logError("Invalid image url:" + story.imageUrl.substr(0, 100) + ", " + story.url);
        }
        if (valid) {
            sanitizedStories.push(story);
        }
        else {
            invalidUrls.push({ url: story.url, urlBase: story.siteBaseUrl });
        }
        /*
        if (story.imageUrl.substr(0, 4) == 'http' || story.imageUrl.trim() == '') {
            if (story.posterId && story.channelId) {
                sanitizedStories.push(story);
            }
            else {
                errorLogger.logError("Missing poster/channel for story:" + story.category + ", " + story.url);
            }
        }
        else {
            invalidUrls.push({ url: story.url, urlBase: story.siteBaseUrl });
            errorLogger.logError("Invalid url for image:" + story.imageUrl + ", " + story.url);
        }
        */
    });
    return { sanitizedStories, invalidUrls };
}

randomizeStorySequence = (array) => {
    let currentIndex = array.length, randomIndex;

    // While there remain elements to shuffle...
    while (currentIndex != 0) {

        // Pick a remaining element...
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;

        // And swap it with the current element.
        [array[currentIndex], array[randomIndex]] = [
            array[randomIndex], array[currentIndex]];
    }

    return array;
}

setDummyTimestamp = (storyInfo, lastPostTimestamp) => {
    if (storyInfo.length != 0) {
        const millisecondsBetweenPosts = Date.now() - lastPostTimestamp
        const spacing = millisecondsBetweenPosts / storyInfo.length;
        let currentTimestamp = lastPostTimestamp;
        storyInfo.forEach((story, index) => {
            storyInfo[index].timestamp = getRandomInt(currentTimestamp, currentTimestamp + spacing);
            currentTimestamp = currentTimestamp + spacing;
        });
    }
}

/*
updatePostedUrls = (postedUrls, stories) => {
    stories.forEach(story => { postedUrls.push(story.url) });
}
*/

sanitizeStoryUrls = (storyUrls) => {
    const sanitizedStoryUrls = [];
    const loadedUrls = {};
    storyUrls.forEach(storyUrl => {
        storyUrl.url = storyUrl.url.trim();
        if (!loadedUrls[storyUrl.url]) {
            loadedUrls[storyUrl.url] = true;
            sanitizedStoryUrls.push(storyUrl);
        }
    });
    return sanitizedStoryUrls;
}

postStoriesInBatches = async (storyInfo, invalidUrls, messageLogger, errorLogger, scrapeStart, scrapeEnd) => {
    //To avoid the chance of posting too much data at once, we split the post up in batches
    const batchSize = 50;

    let ndx = 0;
    messageLogger.logMessage('Posting stories in batches');
    while (storyInfo[ndx] || invalidUrls[ndx]) {
        messageLogger.logMessage('Posting story batch');
        let storyInfoBatch = [];
        let invalidUrlsBatch = [];

        for (let batchCounter = 0; batchCounter < batchSize; batchCounter += 1) {
            if (storyInfo[ndx]) {
                storyInfoBatch.push(storyInfo[ndx]);
            }

            if (invalidUrls[ndx]) {
                invalidUrlsBatch.push(invalidUrls[ndx]);
            }
            ndx += 1;
        }
        await api.postBotStories(storyInfoBatch, invalidUrlsBatch, errorLogger.getErrors(), scrapeStart, scrapeEnd);
    }
}

exports.testScraper = async (sitename) => {
    try {
        const categoriesInfo = await categoryUtils.getCatergoryPaths();
        console.log(categoriesInfo);
        const postedUrls = [];
        let storyInfo = [];
        const ErrorLoggerClass = require("../utils/ErrorLoggerClass.js");
        errorLogger = new ErrorLoggerClass();
        const elementPath = __dirname + '/sites/' + sitename;
        const SiteScraper = require(elementPath + '/SiteScraperClass.js');
        const scraper = new SiteScraper(errorLogger);
        let storyUrls = await scraper.getStoryUrlsAndCategory();
        storyUrls = sanitizeStoryUrls(storyUrls);
        storyUrls = removeAllreadyPostedStories(storyUrls, postedUrls);
        console.log(storyUrls);
        let siteStoryInfo = await scraper.getStoryInfo(storyUrls);
        storyInfo = storyInfo.concat(siteStoryInfo);
        storyInfo = await setCategryIdOnStories(storyInfo, categoriesInfo);
        const botUsers = await api.getBotUsers();
        setPosterAndChannelOnStories(storyInfo, botUsers);
        const { sanitizedStories, invalidUrls } = sanitizeStories(storyInfo);
        storyInfo = sanitizedStories;
        console.log(storyInfo);
        console.log('Stories: ' + storyInfo.length);
        console.log('Errors:');
        errorLogger.consoleLog();
    }
    catch (error) {
        console.log(error);
    }
}

exports.postStories = async (messageLogger, error_logger) => {
    errorLogger = error_logger;
    const categoriesInfo = await categoryUtils.getCatergoryPaths();
    try {
        const scrapeStart = Date.now();

        const lastPost = await api.getBotPosts({ latest: 'latest' });
        let lastPostTimestamp = Date.now() - (6 * 3600000); // Set last post to be 6 hours ago if we have not posted before
        if (lastPost[0]) {
            lastPostTimestamp = lastPost[0].timestamp;
        }

        const path = __dirname + '/sites';
        const folderContent = fs.readdirSync(path);
        let storyInfo = [];
        for (const elementName of folderContent) {
            if (elementName.substr(0, 1) != '_') {
                const elementPath = path + '/' + elementName;
                if (fs.lstatSync(elementPath).isDirectory()) {
                    const SiteScraper = require(elementPath + '/SiteScraperClass.js');
                    const scraper = new SiteScraper(messageLogger, errorLogger);
                    let storyUrls = await scraper.getStoryUrlsAndCategory();
                    storyUrls = sanitizeStoryUrls(storyUrls);
                    const urlArray = [];
                    storyUrls.forEach(storyUrl => {
                        urlArray.push(storyUrl.url);
                    })
                    /*
                    postedUrls = await api.getBotPostedUrls({
                        filtertype: "url_array_filter",
                        urlArray,
                    });
                    */
                    let postedUrls = await getExistingUrls(urlArray);
                    const postedUrlList = [];
                    postedUrls.forEach(postedUrl => { postedUrlList.push(postedUrl.url); });
                    storyUrls = removeAllreadyPostedStories(storyUrls, postedUrlList);
                    let siteStoryInfo = await scraper.getStoryInfo(storyUrls);
                    storyInfo = storyInfo.concat(siteStoryInfo);
                }
            }
        }

        storyInfo = await setCategryIdOnStories(storyInfo, categoriesInfo);
        const botUsers = await api.getBotUsers();
        setPosterAndChannelOnStories(storyInfo, botUsers);
        const { sanitizedStories, invalidUrls } = sanitizeStories(storyInfo);
        storyInfo = sanitizedStories;
        //randomize the sequence so we dont post stories from one site after another
        randomizeStorySequence(storyInfo);
        //set more "natural looking" timestamps on the stories so that we dont get a bunch of stories
        //all with the same timestamp
        setDummyTimestamp(storyInfo, lastPostTimestamp);
        const scrapeEnd = Date.now();
        //console.log(storyInfo);
        // await api.postBotStories(storyInfo, invalidUrls, errorLogger.getErrors(), scrapeStart, scrapeEnd);
        await postStoriesInBatches(storyInfo, invalidUrls, messageLogger, errorLogger, scrapeStart, scrapeEnd);
        // updatePostedUrls(postedUrls, storyInfo);
    }
    catch (error) {
        let message = error;
        if (error.message) {
            message = error.message;
        }
        errorLogger.logError("Some uncaught error in postStories function:" + message);
    }
}

getExistingUrls = async (urlArray) => {

    //We have to split urlArray into smaller arrays and call getBotPostedUrls
    //multiple times. Otherwise we risk getting a '414 Request-URI Too Large' response
    const allPostedUrls = [];
    let ndx = 0;

    while (urlArray[ndx]) {
        let counter = 0;
        const maxListLength = 8; //...should be ok
        const urlList = [];
        for (counter = 0; counter < maxListLength; counter++) {
            if (urlArray[ndx]) {
                urlList.push(urlArray[ndx]);
            }
            ndx += 1;
        }
        let postedUrls = await api.getBotPostedUrls({
            filtertype: "url_array_filter",
            urlArray: urlList,
        });
        postedUrls.forEach(postedUrl => { allPostedUrls.push(postedUrl); })
    }
    return allPostedUrls;
}
