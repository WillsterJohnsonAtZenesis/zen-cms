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
 * A worker pool maintains and manages a pool of workers
 *
 * @ignore(crypto.randomUUID)
 */
qx.Class.define("zx.work.AbstractWorkerPool", {
  extend: qx.core.Object,

  construct() {
    super();
    this.__pendingMessages = [];
  },

  properties: {
    /**
     * Config options for the internal {@link zx.utils.Pool}
     * @type {object} config - configuration options for the pool. These can be changed at any time with the corresponding property
     * @prop {number} [config.minSize] - the minimum number of resources to keep alive in the pool (impacts idle overhead)
     * @prop {number} [config.maxSize] - the maximum number of resources to create in the pool (impacts maximum load)
     * @prop {number} [config.timeout] - the number of milliseconds to wait for a resource to become available before failing
     * @prop {number} [config.pollInterval] - the number of milliseconds between checks for available resources
     */
    poolConfig: {
      check: "Object",
      event: "changePoolConfig",
      init: () => ({})
    },

    schedulerApi: {
      check: "zx.work.api.SchedulerClientApi"
    },

    pollInterval: {
      check: "Integer",
      init: 5_000,
      event: "changePollInterval"
    },

    pushInterval: {
      check: "Integer",
      init: 10_000,
      event: "changePushInterval"
    },

    /**
     * The maximum number of push messages to send at once
     * A higher or lower limit may be appropriate depending on where workers, this pool, and the scheduler are running
     */
    maxPushMessages: {
      check: "Integer",
      init: 100
    }
  },

  objects: {
    pool() {
      const pool = new zx.utils.Pool();
      this.bind(
        "poolConfig",
        new zx.utils.Target(value => {
          if (typeof value.minSize === "number") {
            pool.setMinSize(value.minSize);
          } else {
            pool.resetMinSize();
          }
          if (typeof value.maxSize === "number") {
            pool.setMaxSize(value.maxSize);
          } else {
            pool.resetMaxSize();
          }
          if (typeof value.timeout === "number") {
            pool.setTimeout(value.timeout);
          } else {
            pool.resetTimeout();
          }
          if (typeof value.pollInterval === "number") {
            pool.setPollInterval(value.pollInterval);
          } else {
            pool.resetPollInterval();
          }
        })
      );
      pool.addListener("becomeAvailable", () => {
        console.log("pool sent becomeAvailable");
        this.getQxObject("pollTimer").startTimer();
      });
      pool.addListener("becomeUnavailable", () => {
        console.log("pool sent becomeUnavailable");
        this.getQxObject("pollTimer").killTimer();
      });
      return pool;
    },

    pollTimer() {
      const onPoll = async () => {
        console.log(`[${this.classname}]: polling for work...`);
        let work;
        try {
          work = await this.getSchedulerApi().poll(this.classname);
        } catch {
          console.log(`[${this.classname}]: failed to poll for work`);
          return;
        }
        if (work) {
          console.log(`[${this.classname}]: received work!`);
          let worker = await this.getQxObject("pool").acquire();
          await worker.run(work);
          await worker.poll(); // TODO: something's going wrong - the docker server isn't sending all of it's publications
          // this.getQxObject("pool").release(worker);
        }
      };

      const pollTimer = new zx.utils.Timeout(null, onPoll);
      pollTimer.setRecurring(true);
      this.bind("pollInterval", pollTimer, "duration");
      return pollTimer;
    },

    pushTimer() {
      const onPush = async () => {
        this.__sortPending();
        let currentPending = this.__pendingMessages.splice(0, Math.min(this.__pendingMessages.length, this.getMaxPushMessages()));
        if (!currentPending.length) {
          return;
        }
        try {
          console.log(`[${this.classname}]: pushing ${currentPending.length} messages...`);
          await this.getSchedulerApi().push(currentPending);
        } catch {
          console.log(`[${this.classname}]: failed to push messages`);
          // the server running the scheduler is down - re-add the pending messages and try again later
          this.__pendingMessages.unshift(...currentPending);
        }
      };

      const pushTimer = new zx.utils.Timeout(null, onPush);
      pushTimer.setRecurring(true);
      this.bind("pushInterval", pushTimer, "duration");
      return pushTimer;
    }
  },

  members: {
    /**@type {zx.work.IMessageSpec[]}*/
    __pendingMessages: null,

    /**
     * Utility to generate uniform api paths
     * @param {string} apiName - human-readable name of the api. Must be unique within the class
     * @returns {string} the path in the form `/{{classname}}/{{uuid}}/{{apiName}}/{{randomUuid}}`
     */
    _createPath(apiName) {
      return `/${this.classname}/${this.toUuid()}/${apiName}/${crypto.randomUUID()}`;
    },

    /**
     * Instruct the pool to start creating workers and polling for work
     */
    async startup() {
      await this.getQxObject("pool").startup();
      this.getQxObject("pollTimer").startTimer();
      this.getQxObject("pushTimer").startTimer();
    },

    /**
     * Shut down the pool and all pooled workers
     *
     * Shutdown will wait for all pending messages to send before shutting down, unless a destructiveMs is provided
     * @param {number} [forceAfterMs] - the number of milliseconds to wait before forcibly shutting down. Use any negative value to wait indefinitely. Defaults to -1.
     */
    async shutdown(forceAfterMs = -1) {
      this.getQxObject("pollTimer").killTimer();
      await new Promise(async resolve => {
        let startTime = Date.now();
        while (this.__pendingMessages.length) {
          await new Promise(r => setTimeout(r, this.getPushInterval()));
          if (forceAfterMs >= 0 && Date.now() - startTime > forceAfterMs) {
            break;
          }
        }
        this.getQxObject("pushTimer").killTimer();
        resolve();
      });
      await this.getQxObject("pool").shutdown();
    },

    _onLog(evt) {
      let { caller, message } = evt.getData();
      console.log(`[${this.classname}]: ${caller}: ${message}`);
      this.__pendingMessages.push({ caller, message, time: Date.now(), kind: "log" });
      this.__sortPending();
    },

    _onComplete(evt) {
      let { caller, message, success } = evt.getData();
      console.log(`[${this.classname}]: ${caller} (${success ? "success" : "fail"}): ${message}`);
      this.__pendingMessages.push({ caller, message, time: Date.now(), kind: success ? "success" : "failure" });
      this.__sortPending();
    },

    __sortPending() {
      this.__pendingMessages.sort((a, b) => a.time - b.time);
    }
  }
});
