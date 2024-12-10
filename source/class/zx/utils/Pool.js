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
 * Handles the pooling of resources for reuse given a factory and (optional) paired destructor
 *
 * The pool will ensure that it has at least as many resources as the minimum size, and will create new resources as
 * needed up to the maximum size. If the pool is full and all resources are in use, the acquisition of a resource will
 * wait for up to the timeout milliseconds before failing, conducting a check every pollInterval milliseconds.
 *
 * @template TResource
 */
qx.Class.define("zx.utils.Pool", {
  extend: qx.core.Object,

  construct() {
    super();
    this.__pool = new Map();
  },

  properties: {
    minSize: {
      check: "Number",
      init: 0
    },

    maxSize: {
      check: "Number",
      init: 10
    },

    timeout: {
      check: "Number",
      init: 30_000
    },

    pollInterval: {
      check: "Number",
      event: "changePollInterval",
      init: 5_000
    },

    /**
     * the factory for new resources, and an optional destructor to release them
     * @type {object}
     * @prop {() => Promise<TResource>} create - factory function
     * @prop {(value: TResource) => Promise<void>} [destroy] - optional destructor function
     */
    factory: {
      check: "Object"
    }
  },

  events: {
    becomeAvailable: "qx.event.type.Event",
    becomeUnavailable: "qx.event.type.Event"
  },

  objects: {
    topup() {
      const onTopup = async () => {
        if (this.__pool.size >= this.getMinSize()) {
          return;
        }
        await this.__createNewResource();
      };

      const topup = new zx.utils.Timeout(null, onTopup);
      topup.setRecurring(true);
      this.bind("pollInterval", topup, "duration");
      return topup;
    },

    trim() {
      const onTrim = async () => {
        let needsTrim = this.__pool.size > this.getMinSize();
        for (const [resource, availability] of this.__pool) {
          if (!needsTrim) {
            break;
          }
          if (availability === zx.utils.Pool.UNAVAILABLE) {
            continue;
          }
          await this.__destroyResource(resource);
          needsTrim = this.__pool.size > this.getMinSize();
        }
      };

      const trim = new zx.utils.Timeout(null, onTrim);
      trim.setRecurring(true);
      this.bind("pollInterval", trim, "duration");
      return trim;
    }
  },

  members: {
    /**@type {Map<TResource, Symbol>} */
    __pool: null,
    /**@type {boolean}*/
    __live: false,
    /**@type {boolean}*/
    __available: false,

    /**
     * startup the pool, begins maintaining the pool size based on `minSize`
     */
    async startup() {
      if (this.__live) {
        return;
      }
      this.getQxObject("topup").startTimer();
      this.getQxObject("trim").startTimer();
      this.__updateAvailability();
      this.__live = true;
    },

    /**
     * Safely shut down the pool, destroying all resources
     */
    async shutdown() {
      if (!this.__live) {
        return;
      }
      this.getQxObject("topup").killTimer();
      this.getQxObject("trim").killTimer();
      this.__live = false;
      for (const resource of this.__pool.keys()) {
        await this.__destroyResource(resource);
      }
      this.__updateAvailability();
    },

    /**
     * @returns {boolean} whether this pool has available resources
     */
    available() {
      if (!this.__live) {
        return false;
      }
      for (const availability of this.__pool.values()) {
        if (availability === zx.utils.Pool.AVAILABLE) {
          return true;
        }
      }
      return this.__pool.size < this.getMaxSize();
    },

    /**
     * Acquires a resource from the pool, creating if necessary.
     * If the pool is full, waits and rechecks according to the configuration properties.
     * @returns {TResource} a resource
     */
    async acquire() {
      if (!this.__live) {
        throw new Error("Cannot acquire because the pool is not live - call 'startup' to start the pool");
      }
      const resource = await this.__getOrCreateResource();
      this.__pool.set(resource, zx.utils.Pool.UNAVAILABLE);
      this.__updateAvailability();
      return resource;
    },

    /**
     * Mark a resource as unneeded, making it available for reuse.
     * @param {TResource} resource - a resource
     */
    async release(resource) {
      this.__pool.set(resource, zx.utils.Pool.AVAILABLE);
      this.__updateAvailability();
    },

    /**
     * Update this pools availability, firing events as necessary
     */
    __updateAvailability() {
      let latestAvailability = this.available();
      if (!this.__available && latestAvailability) {
        this.__available = true;
        this.fireEvent("becomeAvailable");
      }
      if (this.__available && !latestAvailability) {
        this.__available = false;
        this.fireEvent("becomeUnavailable");
      }
    },

    /**
     * Creates a resource
     * @returns {TResource} a resource
     */
    async __createNewResource() {
      const resource = await this.getFactory().create();
      this.__pool.set(resource, zx.utils.Pool.AVAILABLE);
      return resource;
    },

    /**
     * Destroys a resource, only if it is not in use
     * @param {TResource} resource - a resource
     */
    async __destroyResource(resource) {
      // safety check: do not destroy a resource that is unavailable
      if (this.__pool.get(resource) === zx.utils.Pool.UNAVAILABLE) {
        return;
      }
      this.__pool.delete(resource);
      await this.getFactory().destroy?.(resource);
    },

    /**
     * Gets an existing resource, or creates a new one if none are available. Implements a timeout-retry loop.
     * @returns {TResource} a resource
     */
    async __getOrCreateResource() {
      const startTime = Date.now();
      while (true) {
        for (const [resource, availability] of this.__pool) {
          if (availability === zx.utils.Pool.UNAVAILABLE) {
            continue;
          }
          return resource;
        }

        if (this.__pool.size < this.getMaxSize()) {
          return await this.__createNewResource();
        }

        if (Date.now() - startTime > this.getTimeout()) {
          throw new Error("Timeout acquiring resource");
        }

        await this.__sleepPollInterval();
      }
    },

    /**
     * Sleeps for the configured poll interval by awaiting a timeout
     */
    async __sleepPollInterval() {
      await new Promise(resolve => setTimeout(resolve, this.getPollInterval()));
    }
  },

  statics: {
    AVAILABLE: Symbol("AVAILABLE"),
    UNAVAILABLE: Symbol("UNAVAILABLE")
  }
});
