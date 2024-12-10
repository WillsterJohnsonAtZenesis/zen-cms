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
 * This interface represents the shape of the POJO used to specify a work item
 */
qx.Interface.define("zx.work.IWorkSpec", {
  members: {
    /**
     * A uuid for the work item
     * @type {string}
     */
    uuid: null,

    /**
     * The classname of the work item
     * @type {string}
     */
    classname: null,

    /**
     * The compatibility is an array of classnames referencing {@link zx.work.AbstractWorkerPool}s that provide an environment
     * this work can run in. To accept any and all environments, pass an empty array.
     * @type {string[]}
     */
    compatibility: null,

    /**
     * Arguments to pass to the work item constructor. Note that the first argument will always be the uuid, and these
     * arguments will follow after.
     * @type {any[]}
     */
    args: null
  }
});
