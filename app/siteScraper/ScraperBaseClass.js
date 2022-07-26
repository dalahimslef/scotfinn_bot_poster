const got = require('got');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;

class ScraperBaseClass {
  siteBaseUrl = '';
  linkPages = {};
  subSelectors = {};
  linkSelector = '';
  headerSelector = '';
  ingressSelector = '';
  imageSelector = '';
  emptySelector = 'div.dummy_empty_selector'; //To select nothing
  errorLogger = undefined;
  messageLogger = undefined;
  runScripts = false;

  constructor(messageLogger, errorLogger) {
    this.errorLogger = errorLogger;
    this.messageLogger = messageLogger;
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

  validateAnchorPath(anchor, path) {
    // Should probably usually return true, but this function can be used as an extra check to see if
    // a link should be included in the selected urls
    return true;
  }

  getUrlCategoriesFromSubSelectors(path, dom) {
    const urlCategoriesFromSubSelectors = {};
    if (this.subSelectors[path]) {
      Object.keys(this.subSelectors[path]).forEach(category => {
        this.subSelectors[path][category].forEach(selector => {
          const anchors = Array.from(dom.window.document.querySelectorAll(selector));
          anchors.forEach(anchor => {
            if (this.validateAnchorPath(anchor, path)) {
              let linkUrl;
              if (anchor.href.substr(0, 4) == 'http') {
                linkUrl = anchor.href;
              }
              else {
                linkUrl = this.siteBaseUrl + anchor.href;
              }
              urlCategoriesFromSubSelectors[linkUrl] = category;
            }
          });
        })
      });
    }
    return urlCategoriesFromSubSelectors;
  }

  async getStoryUrlsAndCategory() {
    this.messageLogger.logMessage(this.siteBaseUrl + ': getStoryUrlsAndCategory');
    const storyUrls = [];
    for (let category of Object.keys(this.linkPages)) {
      this.messageLogger.logMessage('Loading pages in category: ' + category);
      const paths = this.linkPages[category];
      for (let path of paths) {
        const dom = await this.getDom(this.siteBaseUrl + path);
        if (dom) {
          this.messageLogger.logMessage('DOM loaded: ' + this.siteBaseUrl + path);
          const urlCategoriesFromSubSelectors = this.getUrlCategoriesFromSubSelectors(path, dom);
          const anchors = Array.from(dom.window.document.querySelectorAll(this.linkSelector));
          anchors.forEach(anchor => {
            if (this.validateAnchorPath(anchor, path)) {
              let linkUrl;
              if (anchor.href.substr(0, 4) == 'http') {
                linkUrl = anchor.href;
              }
              else {
                linkUrl = this.siteBaseUrl + anchor.href;
              }
              let selectedCategory = category;
              if (urlCategoriesFromSubSelectors[linkUrl]) {
                selectedCategory = urlCategoriesFromSubSelectors[linkUrl];
              }
              storyUrls.push({ category: selectedCategory, url: linkUrl, linkedFrom: path });
            }
          });
        }
        else {
          this.messageLogger.logMessage('failed to load DOM: ' + this.siteBaseUrl + path);
          this.errorLogger.logError('failed to load DOM: ' + this.siteBaseUrl + path);
        }
      }
    }
    return storyUrls;
  }

  getHeaderSelector(url, linkedFrom) {
    return this.headerSelector;
  }

  getIngressSelector(url, linkedFrom) {
    return this.ingressSelector;
  }

  getImageSelector(url, linkedFrom) {
    return this.imageSelector;
  }

  getTitleFromDom(dom, url, linkedFrom) {
    if (dom.window.document.querySelector('title')) {
      return dom.window.document.querySelector('title').textContent;
    }
    return '';
  }

  getHeaderFromDom(dom, url, linkedFrom) {
    let header = "";
    const selector = dom.window.document.querySelector(this.getHeaderSelector(url, linkedFrom));
    if (selector) {
      header = selector.textContent;
    }
    return header;
  }

  getIngressFromDom(dom, url, linkedFrom) {
    let ingress = ""
    const selector = dom.window.document.querySelector(this.getIngressSelector(url, linkedFrom));
    if (selector) {
      ingress = selector.textContent;
    }
    return ingress;
  }

  getImageUrlFromDom(dom, url, linkedFrom) {
    let imageUrl = ""
    const selector = dom.window.document.querySelector(this.getImageSelector(url, linkedFrom));
    if (selector) {
      imageUrl = selector.getAttribute('src');
    }
    return imageUrl;
  }

  async getStoryInfo(storyUrls) {
    this.messageLogger.logMessage('Loading stories from ' + this.siteBaseUrl);
    const storyInfo = [];
    for (let storyUrl of storyUrls) {
      /*
      const dom = await this.getDom(storyUrl.url);
      if (dom) {
        const header = this.getHeaderFromDom(dom);
        const ingress = this.getIngressFromDom(dom);
        const imageUrl = this.getImageUrlFromDom(dom);
        const category = storyUrl.category;
        storyInfo.push({ header, ingress, imageUrl, category, url: storyUrl.url, siteBaseUrl: this.siteBaseUrl });
      }
      */
      const story = await this.getSingleStory(storyUrl);
      if (story) {
        storyInfo.push(story);
      }
    }
    return storyInfo;
  }

  async getSingleStory(storyUrl) {
    //console.log('getting ' + url)
    const url = storyUrl.url;
    const category = storyUrl.category;
    const linkedFrom = storyUrl.linkedFrom;
    let story;
    try {
      const dom = await this.getDom(url);
      if (dom) {
        this.messageLogger.logMessage('DOM loaded: ' + url);
        const header = this.getHeaderFromDom(dom, url, linkedFrom);
        const ingress = this.getIngressFromDom(dom, url, linkedFrom);
        const imageUrl = this.getImageUrlFromDom(dom, url, linkedFrom);
        const language = "en";
        story = { header, ingress, imageUrl, language, category, url, siteBaseUrl: this.siteBaseUrl };
        //console.log(story)
      }
      else{
        this.messageLogger.logMessage('Loading DOM failed: ' + url);
        this.errorLogger.logError('Loading DOM failed: ' + url);
      }
    }
    catch (error) {
      const message = error.message ? error.message : error;
      this.logError(message)
    }
    return story;
  }
}



module.exports = ScraperBaseClass