const scraper = require('./app/siteScraper/siteScraper.js');
const api = require('./app/api/api.js');

const ErrorLoggerClass = require("./app/utils/ErrorLoggerClass.js");
const errorLogger = new ErrorLoggerClass();

const MessageLoggerClass = require("./app/utils/MessageLoggerClass.js");
const messageLogger = new MessageLoggerClass();

const postedUrls = [];
const msBetweenScans = 3600000; // Run every hour

let scrapingInProgress = false;
let nextStartTimestamp = 0;
let completedloops = 0;

async function startLoop() {
    if (!scrapingInProgress && (Date.now() > nextStartTimestamp)) {
        scrapingInProgress = true;
        let msToNextLoop = msBetweenScans;
        try {
            const startTimestamp = Date.now();
            nextStartTimestamp = startTimestamp + msBetweenScans;
            errorLogger.clearErrors();
            messageLogger.clearMessages();
            messageLogger.logMessage('Starting scraper');
            await scraper.postStories(messageLogger, errorLogger, postedUrls);
            //await scraper.testScraper('intellectualtakeout.org');
            const endTimestamp = Date.now();
            msToNextLoop = nextStartTimestamp - endTimestamp;
            if (msToNextLoop < 0) {
                msToNextLoop = 0;
            }
            completedloops += 1;
            messageLogger.logMessage("Completed loops: " + completedloops);
            const scraperLoopExecutionTimeInSeconds = (endTimestamp - startTimestamp) / 1000;
            messageLogger.logMessage('Scraping loop finished. Execution time: ' + scraperLoopExecutionTimeInSeconds + ' seconds.');
        }
        catch (error) {
            let message = error;
            if (error.message) {
                message = error.message;
            }
            errorLogger.logError("Caught error in startLoop:" + message);
        }
        scrapingInProgress = false;
        /*
        When running in Google app engine, the setTimeout function does not seem to work.
        Therefore, to start the loop at specified intervals in app engine we define a cron.yaml file
        to start the loop from the url /start_loop
        */
        setTimeout(startLoop, msToNextLoop);
    }
}

async function serverStart() {
    try {
        postedUrlsData = await api.getBotPostedUrls();
        postedUrlsData.forEach(data => { postedUrls.push(data.url); });
        startLoop();
    }
    catch (error) {
        // console.log('Errorloading postedUrls')
        errorLogger.logError("Error loading postedUrls");
    }
}

console.log('Bot running');
serverStart();


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
app.get("/", (req, res) => {
    let message = "Welcome to Bot inspector.<br>";

    let messages = messageLogger.getMessages();
    messages.forEach(msg => { message += msg + '<br>'; })

    message += '<br>Errors:<br>';
    messages = errorLogger.getErrors();
    messages.forEach(msg => { message += msg + '<br>'; })

    if (scrapingInProgress) {
        message += '<br>...scraping in progress...<br>';
    }
    else {
        let secondsToNextStart = (nextStartTimestamp - Date.now()) / 1000;
        message += '<br>Scraping finished. Next loop starts in ' + secondsToNextStart + ' seconds<br>';
    }
    res.send(message);
});

app.get("/start_loop", (req, res) => {
    startLoop();
    let message = "Completed loops: " + completedloops + "<br>";;
    if (scrapingInProgress) {
        message += "Scraping in progress.<br>";
    }
    else {
        if (completedloops > 0) {
            let secondsToNextStart = (nextStartTimestamp - Date.now()) / 1000;
            message += "Next loop starts in " + secondsToNextStart + " seconds<br>";
        }
    }
    res.send(message);
});

// set port, listen for requests
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Bot interface is running on port ${PORT}.`);
});
