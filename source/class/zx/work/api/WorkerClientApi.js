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
 *
 */
qx.Class.define("zx.work.api.WorkerClientApi", {
  extend: zx.io.api.AbstractClientApi,

  construct(transport, uri) {
    super(transport, [], uri);
    this.subscribe("log", ({ caller, message }) => this.fireDataEvent("log", { caller, message }));
    this.subscribe("complete", ({ caller, success, message }) => this.fireDataEvent("complete", { caller, success, message }));
  },

  members: {
    /**
     * @returns {void}
     */
    async poll() {},

    /**
     * @param {zx.work.IWorkSpec} work
     */
    async run(work) {
      return await this._callMethod("run", [work]);
    }
  }
});
