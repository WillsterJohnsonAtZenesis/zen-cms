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
qx.Class.define("zx.work.api.WorkerServerApi", {
  extend: zx.io.api.AbstractServerApi,

  construct(apiPath) {
    super("zx.work.api.WorkerApi");
    zx.io.api.ConnectionManager.getInstance().registerApi(this, apiPath);
    console.log(`New worker server api at ${apiPath} ready to work!`);
  },

  members: {
    publications: {
      /**
       * Sent when a work logs a message
       * @type {object}
       * @prop {string} caller uuid of the work which called the log
       * @prop {string} message log message
       */
      log: true,
      /**
       * Sent when a work completes, whether successfully or not
       * @type {object}
       * @prop {string} caller uuid of the work which completed
       * @prop {boolean} success `true` if the completion was a safe return, `false` if the completion was an error
       * @prop {string} message return message for a successful completion, or an error message for an unsuccessful completion
       */
      complete: true
    },

    /**
     * Run to ensure the collection of log and complete publications. The transport should manage them independently,
     * however if the process running this server is killed after a publication is sent but before the transport polls,
     * data can be lost.
     * @returns {void}
     */
    async poll() {},

    /**
     * @param {zx.work.IWorkSpec} work
     */
    async run(work) {
      let clazz = qx.Class.getByName(work.classname);
      if (!clazz) {
        throw new Error(`Cannot find class '${work.classname}'`);
      }
      let instance = new clazz(work.uuid, ...work.args);
      if (!(instance instanceof zx.work.AbstractWork)) {
        throw new Error(`Class '${work.classname}' is not an instance of zx.work.AbstractWork`);
      }
      let caller = instance.toUuid();
      const log = message => {
        if (qx.core.Environment.get("qx.debug")) {
          console.log(`[${instance.classname}:${caller}] LOG: ${message}`);
        }
        this.publish("log", { caller, message });
      };
      try {
        let message = await instance.execute(log);
        if (qx.core.Environment.get("qx.debug")) {
          console.log(`[${instance.classname}:${caller}] SUCCESS: ${message}`);
        }
        this.publish("complete", { caller, success: true, message });
      } catch (cause) {
        if (qx.core.Environment.get("qx.debug")) {
          console.log(`[${instance.classname}:${caller}] FAILURE: ${cause.message}`);
        }
        this.publish("complete", { caller, success: false, message: cause.message });
      }
      console.log("before wait");
      await new Promise(res => setTimeout(res, 10_000));
      console.log("after wait");
    }
  }
});
