const ScraperBaseClass = require('../../ScraperBaseClass.js');

class SiteScraperClass extends ScraperBaseClass {
    linkPages = {
        '//world affairs': ['/usa/', '/uk/', '/russia/'],
        '//opinions': ['/op-ed/'],
        '//sport': ['/sport/'],
    }

    linkSelector = 'a.link.link_hover';
    headerSelector = 'h1.article__heading';
    ingressSelector = 'div.article__summary';
    imageSelector = '';

    constructor(messageLogger, errorLogger) {
        super(messageLogger, errorLogger);
        this.siteBaseUrl = "https://www.rt.com"
    }

    validateAnchorPath(anchor, path){
        if ((anchor.href.substr(0, path.length) === path) && anchor.href.length != path.length) {
            return true;
        }
        return false;
    }

    getImageUrlFromDom(dom) {
        // A bit messy since
        // dom.window.document.querySelector('div.article__cover div.media img').src;
        // and dom.window.document.querySelector('div.article__cover div.media picture source').srcset
        // both return a data url.
        let imageUrl = "";
        const picture = dom.window.document.querySelector('div.article__cover div.media picture source');
        if (picture) {
            const dataSrcSet = picture.getAttribute('data-srcset').trim();
            const urlsArray = dataSrcSet.split(" ");
            if (urlsArray[0]) {
                imageUrl = urlsArray[0];
            }
            else {
                this.logError('getting urls from data-srcset failed');
            }
        }
        return imageUrl;
    }
}

module.exports = SiteScraperClass