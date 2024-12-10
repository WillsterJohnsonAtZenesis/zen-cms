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
 *
 * ************************************************************************ */

/**
 * Interface for server transports,
 * which send and receive data from the client
 */
qx.Class.define("zx.io.api.transport.AbstractServerTransport", {
  type: "abstract",
  extend: qx.core.Object,

  members: {
    /**
     * Derived classes implementing server push should override this method
     * Sends a message back to the client.
     * Note: this method is only called if this transport supports server-side push.
     * @param {zx.io.api.IRequestJson} message
     */
    postMessage(message) {
      if (this.supportsServerPush()) {
        throw new Error(`${this.classname} supports server push but does not override the method 'postMessage'`);
      }
    },

    /**
     * Derived classes implementing server push should override this method
     * @returns {boolean} whether this transport supports server-side push
     */
    supportsServerPush() {
      return false;
    }
  }
});
