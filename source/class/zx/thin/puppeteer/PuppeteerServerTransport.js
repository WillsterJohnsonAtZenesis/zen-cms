/**
 * Remote API server transport for puppeteer
 */
qx.Class.define("zx.thin.puppeteer.PuppeteerServerTransport", {
  type: "singleton",
  extend: zx.io.api.transport.AbstractServerTransport,

  construct() {
    super();
    window.addEventListener("message", this._onMessage.bind(this), false);
  },

  members: {
    __ready: false,
    /**
     * Called when we receive a message posted back to us
     *
     * @param {*} evt
     * @returns
     */
    async _onMessage(evt) {
      const PREFIX = zx.thin.puppeteer.PuppeteerUtil.MSG_PREFIX;
      const SUFFIX = zx.thin.puppeteer.PuppeteerUtil.MSG_SUFFIX;
      var t = this;

      // Security
      /*
      if (evt.origin !== "null" && evt.origin !== document.location.origin)
        throw new Error("Access denied because wrong origin, found " + evt.origin + ", expected " + document.location.origin);
      */
      this.__lastSource = evt.source;

      function apiError(err) {
        t.error(err);
        t._postResponse({
          type: "api-error",
          error: err
        });
      }

      // Get data
      var msg = evt.data;

      console.log("Received message: " + msg);
      if (typeof msg == "object") {
        console.log("Received object: " + JSON.stringify(msg));
      }
      if (!msg.startsWith(PREFIX)) return;

      msg = msg.substring(PREFIX.length, msg.length - SUFFIX.length);

      var json;
      try {
        json = zx.utils.Json.parseJson(msg);
      } catch (ex) {
        apiError("Cannot parse message " + msg);
        return;
      }

      let request = new zx.io.api.ServerRequest(this, json);
      let response = new zx.io.api.ServerResponse();
      let connectionManager = zx.io.api.ConnectionManager.getInstance();
      await connectionManager.receiveMessage(request, response);
      this.postMessage(response.toNativeObject());
    },

    /**@override */
    supportsServerPush() {
      return true;
    },
    /**@override */
    postMessage(data) {
      console.log(zx.thin.puppeteer.PuppeteerUtil.MSG_PREFIX + zx.utils.Json.stringifyJson(data) + zx.thin.puppeteer.PuppeteerUtil.MSG_SUFFIX);
    },

    /**@override */
    createPushResponse() {
      return new zx.io.api.ServerResponse();
    },

    /**@override */
    sendPushResponse(response) {
      this.postMessage(response.toNativeObject());
    },

    /**
     * @returns {boolean} Whether the puppeteer server remote API transport has been initialized and is ready to receive messages
     */
    isReady() {
      return this.__ready;
    },

    /**
     * You should setup the remote APIs and call this method shortly after the remote page loads (i.e. not after some complex intialization)
     * in order to notify the puppeteer client that this page is ready to receive remote API calls.
     */
    makeReady() {
      this.__ready = true;
    }
  },

  statics: {}
});
