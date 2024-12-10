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
 * Server api for work scheduling
 *
 * This class also functions as the scheduler itself, keeping track of work and distributing it to pools
 */
qx.Class.define("zx.work.api.SchedulerServerApi", {
  extend: zx.io.api.AbstractServerApi,

  construct(apiPath) {
    super("zx.work.api.SchedulerApi");
    zx.io.api.ConnectionManager.getInstance().registerApi(this, apiPath);

    this.__pendingWork = new zx.utils.PrioritizedList();
    this.__messages = new Map();
  },

  members: {
    /**@type {zx.utils.PrioritizedList<zx.work.IWorkSpec>}*/
    __pendingWork: null,

    /**@type {Map<string, zx.work.IMessageSpec[]>} */
    __messages: null,

    schedule(workConfig) {
      this.__pendingWork.add(workConfig, workConfig.priority ?? 5);
    },

    /**
     * @param {string} classname - classname of the caller, used to determine compatibility with work
     * @returns {Promise<zx.work.IWorkSpec | null>} work data, or an empty object if no work is available
     */
    async poll(classname) {
      return this.__pendingWork.takeFirst(workConfig => !workConfig.compatibility.length || workConfig.compatibility.includes(classname));
    },

    /**
     * @param {zx.work.IMessageSpec[]} messages - messages to push
     */
    async push(messages) {
      console.log(`received ${messages.length} messages`);
      for (let message of messages) {
        if (!this.__messages.has(message.caller)) {
          this.__messages.set(message.caller, []);
        }
        this.__messages.get(message.caller).push(message);
        if (message.kind === "success" || message.kind === "failure") {
          let allMessages = this.__messages.get(message.caller);
          this.__messages.delete(message.caller);
          this.fireDataEvent("complete", allMessages);
        }
      }
    }
  }
});
