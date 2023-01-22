const scraper = require('./app/siteScraper/siteScraper.js');
const api = require('./app/api/api.js');

const ErrorLoggerClass = require("./app/utils/ErrorLoggerClass.js");


const MessageLoggerClass = require("./app/utils/MessageLoggerClass.js");


const postedUrls = [];
//const msBetweenScans = 60000; // Run every minute
const msBetweenScans = 3600000; // Run every hour

const errorLogger = new ErrorLoggerClass();
const messageLogger = new MessageLoggerClass();
let botStatusMessage = '';

async function testScraper() {
    let propertyUrls = await scraper.testScraper('onthemarket.com', messageLogger, errorLogger);
    return propertyUrls;
}

async function startLoop() {
    botStatusMessage = 'Attempting loop start<br>';
    botStatusMessage += 'Getting bot status<br>';
    const botStatus = await api.getBotStatus();
    if (Date.now() > botStatus.nextStartTimestamp) {
        //Checking the botstatus could be done by multiple processes at the same time.
        // To make sure only one process actually starts a scraping-loop we call botStart which sets a "semaphore" in the databse
        //so that only one process is able to start the scraping
        botStatusMessage += 'Reading bot status semaphore<br>';
        const botStart = await api.botStart(); //api.botStart returns true if the bot is not currently running, and marks the bot as running
        if (botStart) {
            errorLogger.clearErrors();
            messageLogger.clearMessages();
            botStatus.scrapingInProgress = true;
            try {
                const startTimestamp = Date.now();
                botStatus.nextStartTimestamp = startTimestamp + msBetweenScans;
                await api.saveBotStatus(botStatus);
                botStatusMessage += 'Starting scraper<br>';
                messageLogger.logMessage('Starting scraper');
                await scraper.postProperties(messageLogger, errorLogger);
                //await scraper.testScraper('intellectualtakeout.org');
                botStatus.completedloops += 1;
                botStatus.lastLoopStartTimestamp = startTimestamp;
                botStatus.lastLoopEndTimestamp = Date.now();
            }
            catch (error) {
                let message = error;
                if (error.message) {
                    message = error.message;
                }
                botStatusMessage += 'Caught error in startLoop<br>';
                errorLogger.logError("Caught error in startLoop:" + message);
                botStatus.botScrapingLoopErrors += 1;
            }
            botStatus.scrapingInProgress = false;
            await api.saveBotStatus(botStatus);
            botStatusMessage += 'Setting bot start semaphore idle<br>';
            await api.setBotIdle();
        }
        else {
            botStatusMessage += 'Bot start semaphore says no start<br>';
            botStatus.scrapingInProgress = false;
            //Bot did not start because it is marked as running.
            //This could happen if multiple processes are attempting to start a loop simultanously...
            if (Date.now() > (botStatus.nextStartTimestamp + (msBetweenScans * 2))) {
                //...but if the bot didnt start even if we are WAY over nextStartTimestamp, we assume something has gone wrong
                //and set the bot to idle.
                botStatus.botStartErrors += 1;
                botStatusMessage += 'Timeout but semaphore set to running: Resetting botstart semaphore<br>';
                await api.setBotIdle();
            }
            await api.saveBotStatus(botStatus);
        }
    }
}

console.log('Bot running');


//Bot is running. Initialize web interface to inspect bot status

require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
//const cors = require("cors");

const app = express();

/*
// Set up cors for the webserver to allow access from javascript on client
const corsOptions = {
    credentials: true,
    enablePreflight: true
}

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(function (req, res, next) {
    const origin = req.get('origin');
    const allowedRemotOrigins = require("./app/config/allowed_remote_origins.js");
    if (allowedRemotOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }
    next()
})
*/

app.disable('x-powered-by')
app.use(bodyParser.json());

// parse requests of content-type - application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: true }));

// simple route
app.get("/", async (req, res) => {
    let message="/test => test scarper</br>/start_loop => start scraper loop</br>/status => get scarper status</br>"
    res.send(message);
});

app.get("/test", async (req, res) => {
    let propertyUrls = await testScraper();

    res.send(propertyUrls);
});


app.get("/status", async (req, res) => {
    const botStatus = await api.getBotStatus();
    let message = "Welcome to Bot inspector.<br>";
    message += botStatusMessage;
    let messages = messageLogger.getMessages();
    messages.forEach(msg => { message += msg + '<br>'; })

    message += '<br>Errors:<br>';
    messages = errorLogger.getErrors();
    messages.forEach(msg => { message += msg + '<br>'; })

    message += '<br>STATUS:<br>';
    message += 'botScrapingLoopErrors:' + botStatus.botScrapingLoopErrors + '<br>';
    message += 'botStartErrors:' + botStatus.botStartErrors + '<br>';
    message += 'completedloops:' + botStatus.completedloops + '<br>';
    message += 'scrapingInProgress:' + botStatus.scrapingInProgress + '<br>';
    const lastLoopEndTimestamp = new Date(botStatus.lastLoopEndTimestamp);
    message += 'last end:' + lastLoopEndTimestamp.getHours() + ':' + lastLoopEndTimestamp.getMinutes() + ':' + lastLoopEndTimestamp.getSeconds() + '<br>';
    const lastLoopStartTimestamp = new Date(botStatus.lastLoopStartTimestamp);
    message += 'last start:' + lastLoopStartTimestamp.getHours() + ':' + lastLoopStartTimestamp.getMinutes() + ':' + lastLoopStartTimestamp.getSeconds() + '<br>';
    const nextStartTimestamp = new Date(botStatus.nextStartTimestamp);
    message += 'next start:' + nextStartTimestamp.getHours() + ':' + nextStartTimestamp.getMinutes() + ':' + nextStartTimestamp.getSeconds() + '<br>';
    const now = new Date(Date.now());
    message += 'current time:' + now.getHours() + ':' + now.getMinutes() + ':' + now.getSeconds() + '<br>';
    if (botStatus.scrapingInProgress) {
        message += '<br>...scraping in progress...<br>';
    }
    else {
        let secondsToNextStart = (botStatus.nextStartTimestamp - Date.now()) / 1000;
        message += '<br>Scraping finished. Next loop starts in ' + secondsToNextStart + ' seconds<br>';
    }
    res.send(message);
});

app.get("/start_loop", async (req, res) => {
    startLoop();

    /*
    const botStatus = await api.getBotStatus();
    let message = "Completed loops: " + botStatus.completedloops + "<br>";;
    if (botStatus.scrapingInProgress) {
        message += "Scraping in progress.<br>";
    }
    else {
        if (botStatus.completedloops > 0) {
            let secondsToNextStart = (botStatus.nextStartTimestamp - Date.now()) / 1000;
            message += "Next loop starts in " + secondsToNextStart + " seconds<br>";
        }
    }
    */
    res.send(botStatusMessage);
});

// set port, listen for requests
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Bot interface is running on port ${PORT}.`);
});
