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
const { Worker } = require("node:worker_threads");

/**
 * The node worker pool runs work in a node worker thread
 */
qx.Class.define("zx.work.pool.NodeWorkerPool", {
  extend: zx.work.pool.AbstractThreadWorkerPool,
  implement: [zx.work.IWorkerFactory],

  environment: {
    "zx.work.pool.NodeWorkerPool.remoteAppPath": "./compiled/source-node/node-worker-service/index.js"
  },

  /**
   * @param {object} config - config for {@link zx.utils.Pool}
   * @param {string} [remoteAppPath] - the path on disk to the compiled entrypoint for the remote worker app. The app will likely extend {@link zx.work.runtime.NodeWorkerApp}. If not provided, defaults to the environment variable `zx.work.pool.NodeWorkerPool.remoteAppPath` (this environment variable defaults to the application named 'node-worker-service' built in source mode)
   */
  construct(config, remoteAppPath) {
    super(config);
    this.__remoteAppPath = remoteAppPath ?? qx.core.Environment.get("zx.work.pool.NodeWorkerPool.remoteAppPath");
  },

  members: {
    /**
     * creates a new instance
     * @param {string} apiPath
     * @returns {Promise<zx.work.api.WorkerClientApi>}
     */
    async _createWorker(apiPath) {
      let nodeWorker = new Worker(this.__remoteAppPath, { name: apiPath, workerData: { apiPath } });
      nodeWorker.on("error", err => console.error(err));
      nodeWorker.on("exit", code => console.log(`Worker stopped with exit code ${code}`));
      return nodeWorker;
    },

    /**
     * @returns {zx.io.api.transport.nodeWorker.Client}
     */
    _createClientTransport() {
      return new zx.io.api.transport.nodeWorker.Client();
    }
  }
});
