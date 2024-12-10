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

/**
 * Client transport for a web worker connection
 *
 * A web worker transport communicates between a web worker and the owner process which spawned it.
 */
qx.Class.define("zx.io.api.transport.webWorker.Client", {
  extend: zx.io.api.transport.AbstractClientTransport,

  events: {
    message: "qx.event.type.Data"
  },

  members: {
    /**@type {Worker | typeof self}*/
    __server: null,

    /**
     * Connects to a server
     * @param {Worker | typeof self} server
     */
    connect(server) {
      if (this.__server) {
        throw new Error("Already connected to server");
      }
      this.__server = server;
      server.addEventListener("message", transportableJson => this.fireDataEvent("message", { data: [transportableJson] }));
    },

    /**
     * Posts a message to the server.
     * @param {string} uri The URI to post the message to
     * @param {zx.io.api.IRequestJson} message
     */
    postMessage(uri, requestJson) {
      if (!this.__server) {
        throw new Error("Not connected to server");
      }
      this.__server.postMessage({ uri, requestJson });
    }
  },

  destruct() {
    delete this.__server;
  }
});
