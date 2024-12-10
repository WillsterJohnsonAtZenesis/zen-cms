/* ************************************************************************
 *
 *  Zen [and the art of] CMS
 *
 *  https://zenesis.com
 *
 *  Copyright:
 *    2019-2022 Zenesis Ltd, https://www.zenesis.com
 *
 *  License:
 *    MIT (see LICENSE in project root)
 *
 *  Authors:
 *    Will Johnson (@willsterjohnson)
 *
 * ************************************************************************ */

const express = require("express");

/**
 * An app to host workers in a separated node process
 *
 * Uses express as the server platform
 */
qx.Class.define("zx.work.runtime.AbstractPeerService", {
  extend: qx.application.Basic,
  type: "abstract",

  construct(route) {
    super();
    this._route = route;
  },

  objects: {
    app() {
      const app = express();
      app.use(zx.io.api.transport.http.ExpressServer.jsonMiddleware());
      return app;
    }
  },

  members: {
    /**
     * @abstract
     */
    _onReady() {
      throw new Error(`Abstract method _onReady of class ${this.classname} not implemented`);
    },

    async main() {
      this.__parseArgv();
      let app = this.getQxObject("app");
      new zx.work.api.WorkerServerApi(this._apiPath);
      new zx.io.api.transport.http.ExpressServer(app, this._route);
      app.listen(this._port, () => {
        console.log(`Worker server is running on port ${this._port}`);
        this._onReady();
      });
    },

    __parseArgv() {
      let [port, apiPath] = process.argv.slice(2);

      if (!port) {
        throw new Error("Port is required - pass as first command line argument");
      }
      if (isNaN(+port)) {
        throw new Error("Port must be a number");
      }
      this._port = +port;

      if (!apiPath) {
        throw new Error("Api path is required - pass as second command line argument");
      }
      this._apiPath = apiPath;
    }
  }
});
