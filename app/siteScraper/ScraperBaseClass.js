const got = require('got');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;

class ScraperBaseClass {
  siteBaseUrl = '';
  emptySelector = 'div.dummy_empty_selector'; //To select nothing
  errorLogger = undefined;
  messageLogger = undefined;
  runScripts = false;

  constructor(messageLogger, errorLogger) {
    this.errorLogger = errorLogger;
    this.messageLogger = messageLogger;
  }

  async initialize() {
    
  }

  logError(message) {
    this.errorLogger.logError(message);
  }

  validImage(imageUrl) {
    if (imageUrl.substr(0, 4) == 'http') {
      return true;
    }
    return false;
  }

  async getDom(url) {
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
      this.logError("Error loading from " + url + ":" + error.response.body);
    }
    return dom;
  }


  getPropertyUrls() {
    return [];
  }
}



module.exports = ScraperBaseClass