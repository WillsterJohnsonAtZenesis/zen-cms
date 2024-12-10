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
 * The web worker pool runs work in a web worker
 *
 * @ignore(Worker)
 */
qx.Class.define("zx.work.pool.WebWorkerPool", {
  extend: zx.work.pool.AbstractThreadWorkerPool,
  implement: [zx.work.IWorkerFactory],

  environment: {
    "zx.work.pool.WebWorkerPool.remoteAppPath": "/web-worker-service/index.js"
  },

  /**
   * @param {object} config - config for {@link zx.utils.Pool}
   * @param {string} [remoteAppPath] - the server request path to the compiled entrypoint for the remote worker app. The app will likely extend {@link zx.work.runtime.NodeWorkerApp}. If not provided, defaults to the environment variable `zx.work.pool.WebWorkerPool.remoteAppPath` (this environment variable defaults to the application named 'web-worker-service' built in source mode)
   */
  construct(config, remoteAppPath) {
    super(this, config);
    this.getQxObject("pool").set;
    this.__remoteAppPath = remoteAppPath ?? qx.core.Environment.get("zx.work.pool.WebWorkerPool.remoteAppPath");
  },

  members: {
    /**
     * creates a new instance
     * @param {string} apiPath
     * @returns {Promise<zx.work.api.WorkerClientApi>}
     */
    async _createWorker(apiPath) {
      let webWorker = new Worker(this.__remoteAppPath, { name: apiPath });
      webWorker.addEventListener("messageerror", evt => console.error(evt.data));

      let resolver;
      let promise = new Promise(res => (resolver = res));
      webWorker.addEventListener("message", resolver, { once: true });
      await promise;
      webWorker.postMessage({ apiPath });

      return webWorker;
    },

    /**
     * @returns {zx.io.api.transport.webWorker.Client}
     */
    _createClientTransport() {
      return new zx.io.api.transport.webWorker.Client();
    }
  }
});
