const ScraperBaseClass = require('../../ScraperBaseClass.js');

class SiteScraperClass extends ScraperBaseClass {
    linkPages = {
        '//world affairs': ['/category/2/', '/category/5/', '/category/8/', '/category/3/', '/category/11/', '/category/14/'],
        '//opinions': ['/category/18/'],
        '//technology': ['/category/10/'],
        '//health': ['/category/4/'],
    }

    linkSelector = 'div div div:nth-of-type(4) div a';
    headerSelector = 'div div div:nth-of-type(4) div h1';
    ingressSelector = 'div div div:nth-of-type(4) div:nth-of-type(2) div:nth-of-type(4) div:nth-of-type(2) div p strong';
    imageSelector = '';

    constructor(messageLogger, errorLogger) {
        super(messageLogger, errorLogger);
        this.siteBaseUrl = "https://www.infowars.com"
    }

    getImageUrlFromDom(dom) {
        let imageUrl = '';
        let selectedElement = dom.window.document.querySelector('meta[name="twitter:image"]');
        if (selectedElement) {
            imageUrl = selectedElement.getAttribute('content').trim();
        }
        if (!this.validImage(imageUrl)) {
            selectedElement = dom.window.document.querySelector('meta[name="twitter:image"]');
            if (selectedElement) {
                imageUrl = selectedElement.getAttribute('content').trim();
            }
        }
        if (!this.validImage(imageUrl)) {
            selectedElement = dom.window.document.querySelector('div div div:nth-of-type(4) div:nth-of-type(2) div div');
            if (selectedElement) {
                imageUrl = dom.window.getComputedStyle(selectedElement).backgroundImage.trim();
                imageUrl = imageUrl.substr(4)
                imageUrl = imageUrl.substr(0, imageUrl.length - 1);
                imageUrl = imageUrl.trim();
            }
        }
        return imageUrl;
    }
}

module.exports = SiteScraperClass