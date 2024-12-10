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

const { isMainThread, workerData } = require("node:worker_threads");

/**
 * An app to host workers running in node worker threads
 */
qx.Class.define("zx.work.runtime.NodeWorkerService", {
  extend: qx.application.Basic,

  members: {
    async main() {
      if (isMainThread) {
        let currentExecution = typeof window !== "undefined" ? "a browser" : "the main process";
        console.warn(
          `zx.work.runtime.NodeWorkerApp is designed for use in a worker thread and should not be executed in ${currentExecution}. Some features may not work correctly, others may cause the application to crash.`
        );
      }
      new zx.work.api.WorkerServerApi(workerData.apiPath);
      new zx.io.api.transport.nodeWorker.Server();
    }
  }
});
