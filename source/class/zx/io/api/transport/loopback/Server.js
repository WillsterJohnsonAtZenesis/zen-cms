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
 *    Patryk Milinowski (@p9malino26)
 *    Will Johnson (@willsterjohnson)
 *
 * ************************************************************************ */

/**
 * The server part of a loopback transport
 *
 * A loopback transport does not communicate across a process boundary, instead it communicates within the same process
 * on the same thread. This is primarily useful for testing and debugging.
 */
qx.Class.define("zx.io.api.transport.loopback.Server", {
  extend: zx.io.api.transport.AbstractServerTransport,

  construct() {
    super();
    this.__clientsByApiUuid = new Map();
  },

  members: {
    /**@type {Map<string, zx.io.api.transport.loopback.Client>}*/
    __clientsByApiUuid: null,

    /**
     * Connects to a client
     * @param {any} id
     * @param {zx.io.api.transport.loopback.Client} client
     */
    connect(client) {
      if (this.__clientsByApiUuid.has(client.toUuid()) && this.__clientsByApiUuid.get(client.toUuid()) !== client) {
        throw new Error("Different client already exists with the same UUID");
      }
      client.addListener("post", evt => {
        let { uri, requestJson } = evt.getData();
        this.__clientsByApiUuid.set(requestJson.headers["Client-Api-Uuid"], client);
        this.receiveMessage(uri, requestJson);
      });
    },

    /**
     * Sends a message back to the client
     * @param {zx.io.api.IRequestJson} requestJson
     */
    postMessage(requestJson) {
      this.__clientsByApiUuid.get(requestJson.headers["Client-Api-Uuid"])?.receiveMessage(requestJson);
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
     * @returns {false}
     */
    supportsServerPush() {
      return true;
    }
  },

  destruct() {
    delete this.__clientsByApiUuid;
  }
});
