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
 * @ignore(fetch)
 */
qx.Class.define("zx.io.api.transport.http.Client", {
  extend: zx.io.api.transport.AbstractClientTransport,

  construct() {
    super();
    this.getQxObject("pollTimer").startTimer();
  },

  events: {
    message: "qx.event.type.Data"
  },

  objects: {
    /**
     * currently the http server does not implement server push.
     * Therefore, we must periodically poll the server te receive publications.
     */
    pollTimer() {
      const onPoll = async () => {
        for (let uri of this._getSubscribedHostnames()) {
          let sessionUuid = this.getSessionUuid(zx.utils.Uri.breakoutUri(uri).hostname);
          if (!sessionUuid) {
            return;
          }
          let requestJson = { headers: { "Session-Uuid": sessionUuid }, type: "poll", body: {} };
          await this.postMessage(uri, requestJson);
        }
      };

      const pollTimer = new zx.utils.Timeout(null, onPoll);
      pollTimer.setRecurring(true);
      pollTimer.setDuration(zx.io.api.transport.http.Client.POLL_INTERVAL);
      return pollTimer;
    }
  },

  members: {
    /**
     * @param {string} uri The URI to post the message to
     * @param {zx.io.api.IRequestJson} requestJson
     */
    async postMessage(uri, requestJson) {
      // ensure trailing slash, default to '/'
      if (!uri) {
        uri = "/";
      }
      if (!uri.startsWith("/") && !uri.match(/^[a-z]+:\/\//i)) {
        uri = `/${uri}`;
      }

      try {
        let response = await fetch(uri, {
          method: "POST",
          body: zx.utils.Json.stringifyJson(requestJson),
          headers: { "Content-Type": "text/plain" }
        });

        let data = await response.json();
        this.getQxObject("pollTimer").setEnabled(true);
        this.fireDataEvent("message", data);
      } catch (err) {
        if (qx.core.Environment.get("qx.debug")) {
          console.error(`Failed to post message to ${uri}`, e);
        }
        this.getQxObject("pollTimer").setEnabled(false);
      }
    }
  },

  statics: {
    POLL_INTERVAL: 5_000
  }
});
