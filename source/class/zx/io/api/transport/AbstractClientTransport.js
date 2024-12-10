/**
 * Basic implementation of the IClientTransport interface.
 */
qx.Class.define("zx.io.api.transport.AbstractClientTransport", {
  type: "abstract",
  extend: qx.core.Object,

  construct() {
    super();
    this.__subscriptions = {};
    this.__sessionUuidForHostname = {};
  },

  events: {
    /**
     * @type {zx.io.api.IRequestJson}
     * This event needs to be fired when a message is received from the server.
     */
    message: "qx.event.type.Data"
  },

  members: {
    /**@type {{ [hostname: string]: number }} Maps hostnames to the number of subscriptions to that hostname */
    __subscriptions: null,
    /**@type {{ [hostname: string]: string }}*/
    __sessionUuidForHostname: null,

    /**
     * @returns {string[]} The hostnames to which this client is subscribed
     */
    _getSubscribedHostnames() {
      let out = [];
      let keys = Object.keys(this.__subscriptions);
      for (let key of keys) {
        if (key == "none") {
          out.push(null);
        } else {
          out.push(key);
        }
      }
      return out;
    },

    /**
     * Must be called from the client transport when it's subscribed to an event
     * @param {string} apiPath
     */
    subscribed(apiPath) {
      this.__subscriptions[apiPath] ??= 0;
      this.__subscriptions[apiPath]++;
    },

    /**
     * Must be called from the client transport when it's unsubscribed from an event
     * @param {string} apiPath
     */
    unsubscribed(apiPath) {
      this.__subscriptions[apiPath]--;
      if (this.__subscriptions[apiPath] === 0) {
        delete this.__subscriptions[apiPath];
      }
    },

    /**
     * Gets a session UUID for a particular hostname of a client API URI
     * @param {string} [hostname]
     */
    getSessionUuid(hostname) {
      hostname ??= "none";
      return this.__sessionUuidForHostname[hostname];
    },

    /**
     * Returns a session UUID for a particular hostname of a client API URI
     * The implementation must be able to store a session UUID for a null hostname as well
     * @param {string | undefined} hostname
     * @param {string} sessionUuid
     */
    setSessionUuid(hostname, sessionUuid) {
      hostname ??= "none";
      let existingUuid = this.__sessionUuidForHostname[hostname];
      if (existingUuid && existingUuid != sessionUuid) {
        this.warn(`Session UUID for hostname ${hostname} is being overwritten`);
      }
      this.__sessionUuidForHostname[hostname] = sessionUuid;
    },

    /**
     * Posts a message to the server.
     * @abstract
     * @param {string} uri The URI to post the message to
     * @param {zx.io.api.IRequestJson} requestJson
     */
    postMessage(uri, requestJson) {
      throw new Error(`Abstract method 'postMessage' of class ${this.classname} not implemented`);
    }
  }
});
