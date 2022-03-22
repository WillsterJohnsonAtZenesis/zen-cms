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
 *    John Spackman (john.spackman@zenesis.com, @johnspackman)
 *
 * ************************************************************************ */

/*
 * Simple server implementation to pair with XhrEndpoint
 *
 */
qx.Class.define("zx.io.remote.FastifyXhrListener", {
  extend: qx.core.Object,

  construct(controller) {
    this.base(arguments);
    this.__controller = controller;
  },

  environment: {
    "zx.io.remote.FastifyXhrListener.sessionTracing": false
  },

  events: {
    addEndpoint: "qx.event.type.Data"
  },

  members: {
    /**
     * ExpressJS/Fastify middleware for API calls
     *
     * @param req {http.Request} the request
     * @param reply {Fastify.Reply} the response
     */
    async middleware(req, reply) {
      const path = req.url;
      try {
        await this._receive(req, reply);
      } catch (ex) {
        qx.log.Logger.error(`Exception during API call to '${path}': ${ex.stack || ex}`);
        reply.code(500).send("" + (ex.message || ex));
      }
    },

    /**
     * Obtains an endpoint for the request.  This MUST be synchronous.
     *
     * @param req {http.Request} the request
     * @return zx.io.remote.NetworkEndpoint
     */
    _getOrCreateEndpoint(req) {
      if (!req.session[this.classname]) req.session[this.classname] = {};
      if (!req.session[this.classname].endpoints) req.session[this.classname].endpoints = {};
      let endpoints = req.session[this.classname].endpoints;

      // localSessionId is just a unique identifier that we use to index into datasource endpoints, because datasource
      //  is global, and we need to reduce the scope down to just the one browser
      let localSessionId = req.session[this.classname].localSessionId || null;
      if (!localSessionId) {
        localSessionId = "" + ++zx.io.remote.FastifyXhrListener.__lastSessionId;
        req.session[this.classname].localSessionId = localSessionId;
      }

      // Each browser can have multiple endpoints simultaneously, for example in a thin client in an iframe as well as
      //  a thick client Desktop app
      let remoteSessionId = req.headers["x-zx-io-remote-sessionuuid"];
      let remoteAppName = req.headers["x-zx-io-remote-applicationname"];
      if (qx.core.Environment.get("zx.io.remote.FastifyXhrListener.sessionTracing")) {
        console.log(
          `localSessionId=${localSessionId}, remoteSessionId=${remoteSessionId}, remoteAppName=${remoteAppName}`
        );
        this.debug(`RECEIVE START: remoteSessionId=${remoteSessionId}`);
      }

      // The first request will restart the endpoint no matter what
      let firstRequest = req.headers["x-zx-io-remote-firstrequest"] == "true";

      // Find the existing endpoint
      let endpoint = this.__controller.findEndpoint("Xhr:" + localSessionId + ":" + remoteAppName);

      // If the remote session id has changed, we will force a reset of the endpoint
      if (endpoint && endpoints[remoteAppName]) {
        if (endpoints[remoteAppName].remoteSessionId != remoteSessionId) {
          firstRequest = true;
          if (qx.core.Environment.get("zx.io.remote.FastifyXhrListener.sessionTracing")) {
            this.debug(
              `Existing endpoint but with wrong session id, NEW remoteSessionId=${remoteSessionId} EXISTING endpoints[${remoteAppName}].remoteSessionId=${
                endpoints[remoteAppName].remoteSessionId
              } (${endpoint.toHashCode()})`
            );
          }
        }
      }

      if (qx.core.Environment.get("zx.io.remote.FastifyXhrListener.sessionTracing")) {
        if (endpoints[remoteAppName])
          this.debug(`endpoints[${remoteAppName}].remoteSessionId=${endpoints[remoteAppName].remoteSessionId}`);
        else this.debug(`endpoints[${remoteAppName}] is undefined`);
        this.debug(
          `endpoint=${
            endpoint ? endpoint.getUuid() : "(null)"
          }, localSessionId=${localSessionId}, indexes=${JSON.stringify(this.__controller.getEndpointIndexes())}`
        );
      }

      // Close the endpoint if this is resetting the endpoint (ie first request)
      if (endpoint && firstRequest) {
        if (qx.core.Environment.get("zx.io.remote.FastifyXhrListener.sessionTracing")) {
          this.debug(
            `Closing existing endpoint uuid=${endpoint.getUuid()} (${endpoint.toHashCode()}) remoteSessionId=${remoteSessionId}}`
          );
        }
        // Because we reuse endpoint IDs, and closing an endpoint is async, then we MUST remove the endpoint now
        //  and then allow it to close
        this.__controller.removeEndpoint(endpoint);
        endpoint.close();
        endpoint = null;
      }
      if (firstRequest) delete endpoints[remoteAppName];

      // If no endpoint, then create one
      if (!endpoint) {
        endpoint = new zx.io.remote.FastifyXhrEndpoint("Xhr:" + localSessionId + ":" + remoteAppName, remoteSessionId);
        this.debug(
          `Opening new endpoint localSessionId=${localSessionId}, remoteAppName=${remoteAppName}, remoteSessionId=${remoteSessionId} (${endpoint.toHashCode()})`
        );
        endpoint.open();
        this.__controller.addEndpoint(endpoint);
        this.fireDataEvent("addEndpoint", { endpoint });
        endpoint.addListenerOnce("close", () =>
          setTimeout(() => {
            // Remove it from the controller if we have not already done it above
            if (qx.lang.Array.contains(this.__controller.getEndpoints(), endpoint))
              this.__controller.removeEndpoint(endpoint);
            endpoint.dispose();
          }, 1)
        );
      }

      // Store the endpoint's last-seen time
      if (!endpoints[remoteAppName]) endpoints[remoteAppName] = {};
      endpoints[remoteAppName].remoteSessionId = remoteSessionId;
      endpoints[remoteAppName].lastSeen = new Date().getTime();

      // Remove expired endpoints
      let oldestEndpoint = new Date().getTime() - zx.io.remote.FastifyXhrListener.__MAX_AGE_UNUSED_ENDPOINTS;
      for (let key in endpoints) {
        let lastSeen = endpoints[key].lastSeen;
        if (lastSeen < oldestEndpoint) {
          delete endpoints[key];
          let expiredEndpoint = this.__controller.findEndpoint("Xhr:" + localSessionId + ":" + key);
          if (expiredEndpoint) {
            expiredEndpoint.CLOSING = true;

            if (qx.core.Environment.get("zx.io.remote.FastifyXhrListener.sessionTracing")) {
              this.debug(
                `Closing expired end point key=${key}, expiredEndpoint=${expiredEndpoint} (${expiredEndpoint.toHashCode()})`
              );
            }
            expiredEndpoint.close();
          }
        }
      }

      return endpoint;
    },

    /**
     * Handles the API call for this API
     *
     * @param req {http.Request} the request
     * @param reply {Fastify.Reply} the response
     */
    async _receive(req, reply) {
      let endpoint = this._getOrCreateEndpoint(req);

      // Forward the packet
      let result = await endpoint._receive(req, reply);

      if (qx.core.Environment.get("zx.io.remote.FastifyXhrListener.sessionTracing")) {
        this.debug(
          `RECEIVE END: remoteSessionId=${remoteSessionId} endpoints[${remoteAppName}].remoteSessionId=${
            endpoints[remoteAppName].remoteSessionId
          } (${endpoint.toHashCode()}), localSessionId=${localSessionId}, indexes=${JSON.stringify(
            this.__controller.getEndpointIndexes()
          )}`
        );
      }
      return result;
    }
  },

  statics: {
    __lastSessionId: 0,

    /** @type{Integer} max age of sessions which have not sent a packet, in milliseconds */
    __MAX_AGE_UNUSED_ENDPOINTS: 10 * 60 * 1000
  }
});
