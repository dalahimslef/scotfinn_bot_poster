const got = require('got');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;


exports.getDomFromUrl = async (url, messageLogger, errorLogger) => {
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
        if (error.response && error.response.body) {
            errorLogger.logError("Error loading from " + url + ":" + error.response.body);
        }
        else {
            errorLogger.logError("Error loading from " + url + ":" + error);
        }
    }
    return dom;
}

