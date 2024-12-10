qx.Class.define("zx.server.puppeteer.PuppeteerClientTransport", {
  extend: zx.io.api.transport.AbstractClientTransport,

  /**
   *
   * @param {*} page
   */
  construct(page) {
    super();
    // Catch console log messages so that we can read the protocol
    this.__page = page;
    page.on("console", msg => this.__onConsole(msg));
  },
  members: {
    __page: null,
    /**
     * Called when a console message is received; this can contain encoded messages that
     * describe method calls and events
     *
     * @param {*} msg
     */
    __onConsole(msg) {
      const PREFIX = zx.thin.puppeteer.PuppeteerUtil.MSG_PREFIX;
      const SUFFIX = zx.thin.puppeteer.PuppeteerUtil.MSG_SUFFIX;

      let str = msg.text();
      str = str.replace(/\[\[__GRASSHOPPER/g, "[[__ZX_PUPPETEER");
      if (str.startsWith(PREFIX)) {
        if (!str.endsWith(SUFFIX)) {
          this.error("Cannot interpret console message: " + str);
          return;
        }
        str = str.substring(PREFIX.length, str.length - SUFFIX.length);
        var json;
        try {
          json = zx.utils.Json.parseJson(str);
        } catch (ex) {
          this.error("Cannot parse console message payload: " + ex + ", string=" + str);

          return;
        }
        this.fireDataEvent("message", json);
      }
    },
    /**
     * @override
     */
    async postMessage(uri, msg) {
      const MSG_PREFIX = zx.thin.puppeteer.PuppeteerUtil.MSG_PREFIX;
      const MSG_SUFFIX = zx.thin.puppeteer.PuppeteerUtil.MSG_SUFFIX;
      let strMsg = zx.utils.Json.stringifyJson(msg);
      strMsg = MSG_PREFIX + strMsg + MSG_SUFFIX;

      await this.__page.evaluate(strMsg => {
        window.postMessage(strMsg, "*");
      }, strMsg);
    },

    shutdown() {
      this.postMessage([{ type: "shutdown" }]);
    }
  }
});
