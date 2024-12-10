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
 * Client api for work scheduling
 */
qx.Class.define("zx.work.api.SchedulerClientApi", {
  extend: zx.io.api.AbstractClientApi,

  construct(transport, uri) {
    super(transport, [], uri);
  },

  members: {
    /**
     * @param {string} classname - classname of the caller, used to determine compatibility with work
     * @returns {Promise<zx.work.IWorkSpec | null>} work data, or an empty object if no work is available
     */
    async poll(classname) {
      return await this._callMethod("poll", [classname]);
    },

    /**
     * @param {zx.work.IMessageSpec} messages - messages to push, in chronological order
     */
    async push(messages) {
      return await this._callMethod("push", [messages]);
    }
  }
});
