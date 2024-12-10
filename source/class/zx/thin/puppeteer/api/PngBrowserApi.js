/**
 * Remote API class for capturing a sequence of PNGs off a webpage
 */
qx.Class.define("zx.thin.puppeteer.api.PngBrowserApi", {
  extend: zx.io.api.AbstractServerApi,
  construct() {
    super("zx.server.puppeteer.api.PngApi");
  },

  events: {
    /**
     * Fired when we tell the page to load the next image that will be taken
     */
    next: "qx.event.type.Event"
  },

  members: {
    /**
     * @override
     */
    _publications: {
      /**
       * @type {Object}
       * Tells the puppeteer client to take a screenshot of the page
       * because we finished rendering the page
       */
      takeScreenshot: {}
    },
    /**
     * @method
     */
    next() {
      this.fireEvent("next");
    }
  }
});
