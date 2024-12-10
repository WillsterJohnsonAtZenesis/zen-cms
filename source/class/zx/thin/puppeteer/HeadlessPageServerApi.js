/**
 * Remote API used for telling the puppeteer client when the server is ready to do the specific
 * tasks that the client wants, e.g. taking PNGs, rendering PDFs, etc.
 */
qx.Class.define("zx.thin.puppeteer.HeadlessPageServerApi", {
  extend: zx.io.api.AbstractServerApi,
  construct() {
    super("zx.server.puppeteer.api.HeadlessPageApi");
    this.__promiseServerReady = new qx.Promise();
    this.__promiseServerFinished = new qx.Promise();
  },
  events: {
    start: "qx.event.type.Event"
  },
  members: {
    /**
     * REMOTE METHOD
     *
     * The client should use this method to wait until the server is ready
     */
    async waitForServer() {
      return this.__promiseServerReady;
    },

    /**
     * REMOTE METHOD
     * Tells the server to do the main work
     */
    async run() {
      this.fireEvent("start");
      return this.__promiseServerFinished;
    },

    serverReady() {
      this.__promiseServerReady.resolve();
    },

    serverFinished() {
      this.__promiseServerFinished.resolve();
    }
  }
});
