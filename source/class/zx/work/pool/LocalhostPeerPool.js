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

const child_process = require("node:child_process");

/**
 * The localhost peer pool runs workers in a separate node process on the same machine
 */
qx.Class.define("zx.work.pool.LocalhostPeerPool", {
  /** @template {import('node:child_process').ChildProcess} TWorker */
  extend: zx.work.pool.AbstractPeerPool,

  environment: {
    "zx.work.pool.LocalhostPeerPool.remoteAppPath": "./compiled/source-node/local-peer-service/index.js",
    /**
     * How the node peer process should be started for debugging, if at all.
     * Options:
     * - "" (empty string) - no debugging (forced if qx.debug=false)
     * - "inspect" - start the node process with the --inspect flag and a random free port within this.nodeDebugRange (default if qx.debug=true)
     * - "break" - start the node process with the --inspect-brk flag and a random free port within this.nodeDebugRange
     */
    "zx.work.pool.LocalhostPeerPool.inspector": "inspect"
  },

  /**
   * @param {string} route - the base path on the node remote app for zx apis. Be certain that this exactly matches the route configured on the server, eg {@link zx.work.runtime.ExpressService}
   * @param {object} config - config for {@link zx.utils.Pool}
   * @param {string} [remoteAppPath] - the path on disk to the compiled entrypoint for the remote worker app. The app will likely extend {@link zx.work.runtime.ExpressService}. If not provided, defaults to the environment variable `zx.work.pool.LocalhostPeerPool.remoteAppPath` (this environment variable defaults to the application named 'local-peer-service' built in source mode)
   */
  construct(route, config, remoteAppPath) {
    super(config);
    if (route.endsWith("/")) {
      route = route.substring(0, route.length - 1);
    }
    if (!route.startsWith("/")) {
      route = `/${route}`;
    }
    this.__route = route;
    this.__remoteAppPath = remoteAppPath ?? qx.core.Environment.get("zx.work.pool.LocalhostPeerPool.remoteAppPath");
  },

  members: {
    /**
     * @abstract
     * @param {number} port
     * @param {string} apiPath
     * @returns {Promise<zx.work.api.WorkerClientApi>}
     */
    async _createWorker(port, apiPath) {
      let params = [this.__remoteAppPath, port, apiPath];
      if (qx.core.Environment.get("qx.debug")) {
        params.unshift(qx.core.Environment.get("zx.work.pool.LocalhostPeerPool.inspector"));
      }

      let res = child_process.spawn("node", params, {});

      let prefix = `[${this.classname}: node ${params.slice(-3).join(" ")}]`;

      let resolve;
      let promise = new Promise(res => (resolve = res));
      res.stdout.on("data", data => {
        // we account for an extra \n character as we are reading command line output
        if (data.toString() === zx.work.pool.LocalhostPeerPool.READY_SIGNAL + "\n") {
          resolve?.();
          resolve = null;
          return;
        }
        console.log(`${prefix} stdout: ${data}`);
      });
      res.stderr.on("data", data => console.error(`${prefix} stderr: ${data}`));
      res.on("close", code => console.log(`${prefix} child process exited with code ${code}`));
      console.log(`[${this.classname}] spawned worker, waiting for ready signal...`);
      await promise;
      console.log(`[${this.classname}] worker ready`);
      return res;
    },

    /**
     * @override
     * @param {number} port
     * @param {string} apiPath
     * @returns {zx.io.api.transport.AbstractClientTransport}
     */
    _createClient(port, apiPath) {
      let host = `http://localhost:${port}`;
      let transport = new zx.io.api.transport.http.Client();
      let client = new zx.work.api.WorkerClientApi(transport, host + this.__route + apiPath);
      return client;
    },

    /**
     * @override
     * @param {import('node:child_process').ChildProcess} peerProcess
     * @param {() => void} cleanup - must be called once the worker has been destroyed
     */
    _destroyWorker(peerProcess, cleanup) {
      peerProcess.once("close", cleanup);
      peerProcess.kill();
    }
  },

  statics: {
    READY_SIGNAL: "zx.work.pool.LocalhostPeerPool.READY_SIGNAL"
  }
});
