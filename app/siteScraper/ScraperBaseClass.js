const { UnsupportedProtocolError } = require('got');
const got = require('got');
const jsdom = require("jsdom");
const api = require('../api/api.js');
const { JSDOM } = jsdom;
const domUtils = require('../utils/domUtils.js');

class ScraperBaseClass {
  siteName = '';
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

  getGetGoogleLatitudeFromDom(propertyDom) {
    return -1000;
  }

  getGetGoogleLongitudeFromDom(propertyDom) {
    return -1000;
  }

  getGetFormattedAdressFromDom(propertyDom) {
    return '';
  }

  getGetAddressComponentsFromDom(propertyDom) {
    return [];
  }

  getGeCountryFromDom(propertyDom) {
    return '';
  }

  getAgentFromDom(propertyDom) {
    return { name: '', logo_url: '', website: '', email: '', phone: '' };
  }

  initializePropertyDom(propertyDom) {

  }

  async getPropertyInfoFromUrl(propertyUrl) {
    const propertyDom = await domUtils.getDomFromUrl(propertyUrl, this.messageLogger, this.errorLogger);
    if (propertyDom) {
      this.initializePropertyDom(propertyDom);

      /*
      image_urls: [{
        image: type: String,
        thumbnail: type: String,
      }]
      unformatted_address: type: String
      formattedAdress: type: String
      addressComponents: type: Array
      country: type: String
      google_latitude: type: Number
      google_longitude: type: Number
      */

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
        google_latitude: this.getGetGoogleLatitudeFromDom(propertyDom),
        google_longitude: this.getGetGoogleLongitudeFromDom(propertyDom),
        formattedAdress: this.getGetFormattedAdressFromDom(propertyDom),
        addressComponents: this.getGetAddressComponentsFromDom(propertyDom),
        country: this.getGeCountryFromDom(propertyDom),
        agent: this.getAgentFromDom(propertyDom),
        property_url: propertyUrl,
      }
      console.log(returnObject);
      return returnObject;
    }
    else {
      return false;
    }
  }

  async getExistingProperties() {
    const existingProperties = {};
    const existingPropertyUrls = await api.getSitePropertyUrls(this.siteName);
    existingPropertyUrls.forEach(property => {
      existingProperties[property.property_url] = property;
    });
    return existingProperties;
  }

  async getPropertyInfo() {
    const propertyInfo = [];
    const invalidUrls = [];
    const propertiyUrlsToDelete = [];
    const existingPropertyUrls = await this.getExistingProperties();
    const nonexistentProperties = {};

    Object.keys(existingPropertyUrls).forEach(url => {
      nonexistentProperties[url] = url;
    })

    const propertyUrls = await this.getPropertyUrls();
    for (let propertyUrl of propertyUrls) {
      if (nonexistentProperties[propertyUrl]) {
        delete nonexistentProperties[propertyUrl];
      }
      if (!existingPropertyUrls[propertyUrl]) {
        console.log(propertyUrl);
        const info = await this.getPropertyInfoFromUrl(propertyUrl);
        if (info) {
          propertyInfo.push(info);
        }
        else {
          invalidUrls.push(propertyUrl);
        }
      }
    }
    Object.keys(nonexistentProperties).forEach(url => {
      propertiyUrlsToDelete.push(url);
    })
    return { propertyInfo, invalidUrls, propertiyUrlsToDelete };
  }

  async _debug_getPropertyInfo() {
    const debug_properties = require('../utils/propertyInfo.js');

    const propertyInfo = [];
    const invalidUrls = [];
    const propertiyUrlsToDelete = [];
    const existingPropertyUrls = await this.getExistingProperties();
    const nonexistentProperties = {};

    Object.keys(existingPropertyUrls).forEach(url => {
      nonexistentProperties[url] = url;
    })

    debug_properties.forEach(prop => {
      let propertyUrl = prop.property_url;
      if (nonexistentProperties[propertyUrl]) {
        delete nonexistentProperties[propertyUrl];
      }
      if (!existingPropertyUrls[propertyUrl]) {
        propertyInfo.push(prop);
      }

    });
    Object.keys(nonexistentProperties).forEach(url => {
      propertiyUrlsToDelete.push(url);
    })
    return { propertyInfo, invalidUrls, propertiyUrlsToDelete };
  }
}



module.exports = ScraperBaseClass