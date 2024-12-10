/*
 * @ignore(Buffer)
 */

const puppeteer = require("puppeteer-core");

/**
 * Wraps the puppeteer instance and adds API callbacks and low level integration
 */
qx.Class.define("zx.server.puppeteer.PuppeteerClient", {
  extend: qx.core.Object,

  events: {
    /** Fired when an event arrives from Chromium */
    event: "qx.event.type.Data",

    /** Fired when Chromium closes */
    close: "qx.event.type.Event",

    /** Fired when Chromium sends logging output */
    log: "qx.event.type.Data",

    /** Fired when the Chromium sends a ping to show that it is still alive and working */
    ping: "qx.event.type.Event"
  },

  properties: {
    /** The URL to go to */
    url: {
      check: "String"
    },

    /** The Chromium endpoint to connect to */
    chromiumEndpoint: {
      init: null,
      nullable: true,
      check: "String"
    },

    /** Debug mode */
    debug: {
      init: false,
      check: "Boolean"
    },

    /** Username to authenticate with */
    username: {
      init: null,
      nullable: true,
      check: "String"
    },

    /** Password to authenticate with */
    password: {
      init: null,
      nullable: true,
      check: "String"
    },

    /** How long to wait for navigation, in seconds */
    navigationTimeout: {
      init: 30,
      nullable: false,
      check: "Integer"
    },

    /** Width of the page */
    viewportWidth: {
      init: 1920,
      check: "Integer"
    },

    /** Height of the page */
    viewportHeight: {
      init: 1080,
      check: "Integer"
    },

    /** Whether we allow the chromium instance to run with a GUI */
    allowHeadfull: {
      init: false,
      check: "Boolean"
    },

    /** Whether to wait for the debugger before loading a page */
    debugOnStartup: {
      init: false,
      check: "Boolean"
    }
  },

  members: {
    /** @type {import("puppeteer-core").Browser | null} */
    _browser: null,
    _page: null,
    __closed: false,

    /**
     * @Override
     */
    toString() {
      let str = super.toString();
      let endpoint = this.getChromiumEndpoint();
      if (endpoint) {
        str += " " + endpoint;
      }
      return str;
    },

    /**
     * Starts the connection to the Chromium instance in docker, completes only when the
     * page is loaded and ready to respond.  The page is required to instantiate an
     * instance of `zx.thin.puppeteer.HeadlessPage` which will be used to communicate
     * with this instance of zx.server.puppeteer.PuppeteerClient, including calling API
     * methods and sending events
     */
    async start() {
      if (this._browser) {
        throw new Error("Cannot start more than once");
      }

      let opts = {
        browserWSEndpoint: this.getChromiumEndpoint(),
        defaultViewport: {
          width: this.getViewportWidth(),
          height: this.getViewportHeight(),
          isLandscape: true
        }
      };

      if ((this.isDebug() && this.isAllowHeadfull()) || (qx.core.Environment.get("qx.debug") && qx.core.Environment.get("zx.server.puppeteer.ChromiumDocker.useLocalContainer"))) {
        opts.headless = false;
        opts.slowMo = 200;
        opts.devtools = true;
      }

      opts.args = ["--no-sandbox", "--disable-setuid-sandbox"];

      /** @type {Promise<import("puppeteer-core").Browser>} */
      const startup = async () => {
        const maxPasses = 10;
        for (let pass = 0; true; pass++) {
          try {
            console.log(`[attempt:${pass}/${maxPasses}] connecting to puppeteer - opts: ${JSON.stringify(opts, null, 2)}`);
            return await puppeteer.connect(opts);
          } catch (ex) {
            pass++;
            if (pass > maxPasses) {
              throw ex;
            }
            const timeout = pass * 1000;
            console.log(`Failed to connect to puppeteer, retrying in ${timeout}ms`);
            await new Promise(res => setTimeout(res, timeout));
          }
        }
      };

      this._browser = await startup();

      this.info("Started Puppeteer - " + this.getChromiumEndpoint().replace(/^ws:/, "http:"));

      let result = null;

      let page = (this._page = await this._browser.newPage());
      page.on("console", this._onConsole.bind(this));

      console.log("new page viewport", { width: this.getViewportWidth(), height: this.getViewportHeight() });
      page.setViewport({ width: this.getViewportWidth(), height: this.getViewportHeight() });
      let url = this.getUrl();

      let username = this.getUsername();
      let password = this.getPassword();
      if (username && password) {
        var authHeader = new Buffer.from(username + ":" + password).toString("base64");
        if (url.indexOf("?") > -1) {
          url += "&";
        } else url += "?";
        url += "X-Authorization=" + encodeURIComponent("Basic " + authHeader) + "&X-Auth-Login=true";
        console.log("Setting auth header Basic " + authHeader);
      }

      page.setDefaultNavigationTimeout(0);

      // Catch all failed requests like 4xx..5xx status codes
      page.on("requestfailed", request => {
        this.error(`Request failed for url ${request.url()}: ${request.failure().errorText}`);
      });

      // Catch console log errors
      page.on("pageerror", err => {
        this.error(`Page error: ${err.toString()}`);
      });

      page.on("close", () => {
        this.fireEvent("close");
      });

      if (this.isDebugOnStartup()) {
        url = `http://127.0.0.1:9000/dev/puppeteer-debug-corral?redirect=${encodeURIComponent(url)}`;
      }
      console.log("Going to " + url);
      let response = await page.goto(url, {
        waitUntil: "networkidle0",
        timeout: 0
      });

      console.log(" ********** At " + url);

      if (response.status() != 200) {
        result = {
          status: "error",
          type: "status",
          statusCode: response.status(),
          statusText: response.statusText(),
          url: this.getUrl()
        };

        throw new Error(`Page navigation error: ${JSON.stringify(result, null, 2)}`);
      }

      //wait until page is ready
      let pageReady = false;
      const MAX_PASSES = 50;
      for (let pass = 0; pass < MAX_PASSES; pass++) {
        let ready = await page.evaluate(() => zx?.thin?.puppeteer?.PuppeteerServerTransport?.getInstance().isReady());
        if (ready) {
          pageReady = true;
          console.log(`took ${pass} passes`);
          break;
        }
        console.log("Page remote API not ready yet, waiting...");
        await new Promise(res => setTimeout(res, 1000));
      }

      if (!pageReady) {
        throw new Error("Page did not become ready to use remote APIs within timeout");
      }
      return result;
    },

    /**
     * Gracefully shuts down the connection and lets go of the chromium
     */
    async stop() {
      this._page = null;
      try {
        await this._browser.disconnect();
      } catch (ex) {
        this.error("Error while closing browser during stop: " + ex);
      }
      this._browser = null;
    },

    /**
     * Kills the browser
     */
    async kill() {
      this._page = null;
      if (this._browser) {
        try {
          this._browser.disconnect();
          //this._browser.close();
        } catch (ex) {
          this.warn("Error while closing browser during kill: " + ex);
        }
        this._browser = null;
      }
    },

    /**
     * Returns the page
     *
     * @returns
     */
    getPage() {
      return this._page;
    },

    /**
     * Called when a console message is received; this can contain encoded messages that
     * describe method calls and events
     *
     * @param {*} msg
     */
    _onConsole(msg) {
      const PREFIX = zx.thin.puppeteer.PuppeteerUtil.MSG_PREFIX;
      let str = msg.text();

      if (str.startsWith(PREFIX)) {
        return; //ignore messages with prefix because they are for puppeteer api connumications
      }
      if (this.isDebug()) {
        console.log("PAGE LOG: ", new Date(), ": ", msg.text());
      }
      const TYPES = {
        log: "info",
        error: "error",
        warn: "warn",
        debug: "debug"
      };

      var type = TYPES[msg.type()] || "info";
      str = "PUPPET CONSOLE: " + str;
      if (this.fireDataEvent("log", { type: type, msg: str }, null, true)) {
        this[type](str);
      }
    },

    /**
     * Called when the HeadlessPage is shutting down
     */
    _onReceiveShutdown() {},

    /**
     * Takes a screenshot as PNG
     *
     * @param {String} outputTo filename to save to
     * @returns
     */
    async screenshot(outputTo) {
      let opts = {
        path: outputTo,
        imageType: "png"
      };

      return this._page.screenshot(opts);
    },

    /**
     * Prints a PDF
     *
     * @param {String} outputTo filename to print to
     * @returns
     */
    async printToPdf(outputTo) {
      return await this._page.pdf({ path: outputTo, format: "A4" });
    },

    /**
     * Outputs an error message
     *
     * @param {String} msg message to output
     */
    error(msg) {
      if (this.fireDataEvent("log", { type: "error", msg: msg }, null, true)) {
        super.error(msg);
      }
    }
  }
});
