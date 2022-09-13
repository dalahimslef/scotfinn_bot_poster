const got = require('got');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const domUtils = require('../utils/domUtils.js');

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

  getPropertyTypeFromDom(propertyDom) {
    return 'detached house'; // Detached house, Semi-detached house, Terraced house, Bungalow, Flats / apartments, Farms / land, Park homes
  }

  getSaleTypeFromDom(propertyDom) {
    return 'sale'; // sale, lease, etc...
  }

  getPriceFromDom(propertyDom) {
    return 0;
  }

  getHouseSqmFromDom(propertyDom) {
    return 0;
  }

  getLandSqmFromDom(propertyDom) {
    return 0;
  }

  getBedroomCountFromDom(propertyDom) {
    return 0;
  }

  getConstructionYearFromDom(propertyDom) {
    return 1900;
  }

  getImageUrlsFromDom(propertyDom) {
    return [];
  }

  getUnformattedAddressFromDom(propertyDom) {
    return '';
  }

  getGetGoogleCoordinatesFromDom(propertyDom) {
    return { latitude: -1000, longitude: -1000 };
  }

  initializePropertyDom(propertyDom){
    
  }

  async getPropertyInfoFromUrl(propertyUrl) {
    const propertyDom = await domUtils.getDomFromUrl(propertyUrl);
    if (propertyDom) {
      this.initializePropertyDom(propertyDom);
      const returnObject = {
        property_type: this.getPropertyTypeFromDom(propertyDom),
        sale_type: this.getSaleTypeFromDom(propertyDom),
        //ownership_type: 'ownership', //ownership, shared ownership
        price: this.getPriceFromDom(propertyDom),
        house_sqm: this.getHouseSqmFromDom(propertyDom),
        land_sqm: this.getLandSqmFromDom(propertyDom),
        bedroom_count: this.getBedroomCountFromDom(propertyDom),
        construction_year: this.getConstructionYearFromDom(propertyDom),
        image_urls: this.getImageUrlsFromDom(propertyDom),
        unformatted_address: this.getUnformattedAddressFromDom(propertyDom),
        google_coordinates: this.getGetGoogleCoordinatesFromDom(propertyDom),
        property_url:propertyUrl,
      }
      console.log(returnObject);
      return returnObject;
    }
    else {
      return false;
    }
  }

  async getPropertyInfo() {
    const propertyInfo = [];
    const invalidUrls = [];
    const propertyUrls = await this.getPropertyUrls();
    for (let propertyUrl of propertyUrls) {
      console.log(propertyUrl);
      const info = await this.getPropertyInfoFromUrl(propertyUrl);
      if (info) {
        propertyInfo.push(info);
      }
      else {
        invalidUrls.push(propertyUrl);
      }
    }
    return { propertyInfo, invalidUrls };
  }
}



module.exports = ScraperBaseClass