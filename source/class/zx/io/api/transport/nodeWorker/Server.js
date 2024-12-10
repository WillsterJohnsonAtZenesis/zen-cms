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

const { isMainThread, parentPort, Worker, MessagePort } = require("node:worker_threads");

/**
 * Server transport for a node worker thread connection
 *
 * A node worker transport communicates between a node worker thread and the owner process which spawned it.
 */
qx.Class.define("zx.io.api.transport.nodeWorker.Server", {
  extend: zx.io.api.transport.AbstractServerTransport,

  construct() {
    super();
    this.__clientsByApiUuid = new Map();

    if (!isMainThread) {
      this.connect(parentPort);
    }
  },

  members: {
    /**@type {Map<string, Worker | MessagePort>}*/
    __clientsByApiUuid: null,

    /**
     * Connects a client to the server
     * @param {Worker | MessagePort} client
     */
    connect(client) {
      if (!(client instanceof Worker) && !(client instanceof MessagePort)) {
        throw new Error(["Client must be a node Worker or MessagePort", '\tconst { Worker, MessagePort } = require("node:worker_threads")'].join("\n"));
      }
      client.on("message", ({ uri, requestJson }) => {
        this.__clientsByApiUuid.set(requestJson.headers["Client-Api-Uuid"], client);
        this.receiveMessage(uri, requestJson);
      });
    },

    /**
     * Sends a message back to the client.
     * Only works if this transport support server-side push
     * @param {zx.io.api.IRequestJson} requestJson
     */
    postMessage(requestJson) {
      this.__clientsByApiUuid.get(requestJson.headers["Client-Api-Uuid"])?.postMessage(requestJson);
    },

    /**
     * @param {string} uri
     * @param {zx.io.api.IRequestJson} requestJson
     */
    async receiveMessage(uri, requestJson) {
      let request = new zx.io.api.ServerRequest(this, requestJson);
      if (uri) {
        let breakout = zx.utils.Uri.breakoutUri(uri);
        request.setPath(breakout.path);
      }
      let response = new zx.io.api.ServerResponse();
      await zx.io.api.ConnectionManager.getInstance().receiveMessage(request, response);
      for (let data of response.getData()) {
        this.postMessage(data);
      }
    },

    /**
     * Override this method to return true if the transport supports server-side push.
     * @returns {true}
     */
    supportsServerPush() {
      return true;
    }
  },

  destruct() {
    delete this.__clientsByApiUuid;
  }
});
