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
 * The peer pool runs workers in a separate node process
 * @template TWorker
 */
qx.Class.define("zx.work.pool.AbstractPeerPool", {
  extend: zx.work.AbstractWorkerPool,

  /**
   * @param {object} config - config for {@link zx.utils.Pool}
   */
  construct(config) {
    super();
    this.__workerMap = new Map();
    this.setPoolConfig(config);
    this.getQxObject("pool").setFactory(this);
  },

  properties: {
    remoteServerRange: {
      check: "zx.utils.Range"
    },

    nodeDebugRange: {
      check: "zx.utils.Range"
    }
  },

  members: {
    /**@type {Map<zx.work.api.WorkerClientApi, [process: TWorker, port: number]>} */
    __workerMap: null,

    /**
     * @abstract
     * @param {number} port
     * @param {string} apiPath
     * @returns {Promise<zx.work.api.WorkerClientApi>}
     */
    async _createWorker(port, apiPath) {
      throw new Error(`Abstract method _createWorker of class ${this.classname} not implemented`);
    },

    /**
     * @abstract
     * @param {number} port
     * @param {string} apiPath
     * @returns {zx.io.api.transport.AbstractClientTransport}
     */
    _createClient(port, apiPath) {
      throw new Error(`Abstract method _createClient of class ${this.classname} not implemented`);
    },

    /**
     * @abstract
     * @param {TWorker} peerProcess
     * @param {() => void} cleanup - must be called once the worker has been destroyed
     */
    _destroyWorker(peerProcess, cleanup) {
      throw new Error(`Abstract method _destroyWorker of class ${this.classname} not implemented`);
    },

    /**
     * creates a new instance
     * @returns {Promise<zx.work.api.WorkerClientApi>}
     */
    async create() {
      let apiPath = this._createPath("workerApi");
      let port = this.getRemoteServerRange().acquire();

      let peerProcess = await this._createWorker(port, apiPath);
      let client = this._createClient(port, apiPath);

      this.__workerMap.set(client, [peerProcess, port]);

      client.addListener("log", this._onLog, this);
      client.addListener("complete", this._onComplete, this);

      return client;
    },

    /**
     * Destroys an instance entirely
     * @param {zx.work.api.WorkerClientApi} client
     */
    async destroy(client) {
      let result = this.__workerMap.get(client);
      if (!result) {
        return;
      }
      let [peerProcess, port] = result;
      this._destroyWorker(peerProcess, () => this.getRemoteServerRange().release(port));

      this.__workerMap.delete(client);
      client.removeListener("log", this._onLog, this);
      client.removeListener("complete", this._onComplete, this);
      client.dispose();
    }
  }
});
