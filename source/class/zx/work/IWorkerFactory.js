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
 * An IWorkerFactory creates workers for a worker pool
 */
qx.Interface.define("zx.work.IWorkerFactory", {
  members: {
    /**
     * creates a new instance
     *
     * Typically, this method will create a worker client api, spin up the worker runtime, and connect the client to the
     * server within the runtime.
     * @returns {Promise<zx.work.api.WorkerClientApi>}
     */
    async create() {},

    /**
     * Destroys an instance entirely
     *
     * Typically, this method will shutdown the worker runtime, and dispose of the worker client api and transports.
     * @param {zx.work.api.WorkerClientApi} client
     */
    async destroy(client) {}
  }
});
