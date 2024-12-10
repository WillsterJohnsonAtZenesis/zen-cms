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
 * A Work is a single executable task
 */
qx.Class.define("zx.work.AbstractWork", {
  type: "abstract",
  extend: qx.core.Object,

  /**
   * @param {string} uuid - a uuid to uniquely identify this work
   */
  construct(uuid) {
    super();
    this.setExplicitUuid(uuid);
  },

  members: {
    /**
     * Executes the work
     * @abstract
     * @param {zx.work.OutputClientApi} output - the output api
     * @returns {Promise<string | void> | string | void}
     */
    execute() {
      throw new Error(`Abstract method 'execute' of ${this.classname} not implemented`);
    }
  }
});
