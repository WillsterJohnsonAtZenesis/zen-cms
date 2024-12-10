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
 * Collect a dynamic list of items ordered by priority
 *
 * @template TItem
 */
qx.Class.define("zx.utils.PrioritizedList", {
  extend: qx.core.Object,

  /**
   *
   */
  construct() {
    super();
    this.__items = new Map();
  },

  members: {
    /**@type {Map<Integer, TItem[]>}*/
    __items: null,

    /**
     * Adds an item to the list
     *
     * Recommendation: use `1` as a low priority and `9` as high priority. Do not exceed the 1-9 (inclusive) range.
     * Priorities with a lower numeric value are considered to be lower priority.
     *
     * @param {TItem} item - the item to add
     * @param {Integer} [priority=5] - the priority for the item. Defaults to 5
     */
    add(item, priority = 5) {
      if (qx.core.Environment.get("qx.debug")) {
        qx.core.Assert.assertInteger(priority);
      }
      if (!this.__items.has(priority)) {
        this.__items.set(priority, []);
      }
      this.__items.get(priority).push(item);
    },

    /**
     * Finds the next item based on priority and insertion order, removes it from the list, and returns it.
     * @return {TItem | null} the next item to process, or null if there are no more items
     */
    next() {
      for (let priority of this.__sortedKeys()) {
        let items = this.__items.get(priority);
        if (items.length) {
          return items.shift();
        }
      }
      return null;
    },

    /**
     * Find the first item by priority and insertion order that matches the predicate
     * @param {(item: TItem) => boolean} predicate - the predicate to test
     * @returns {TItem | null} the first item that matches the predicate, or null if no items match
     */
    takeFirst(predicate) {
      for (let priority of this.__sortedKeys()) {
        let items = this.__items.get(priority);
        for (let item of items) {
          if (predicate(item)) {
            items.splice(items.indexOf(item), 1);
            return item;
          }
        }
      }
      return null;
    },

    /**
     * Converts the list to a single array, ordered by priority and insertion order
     * @return {TItem[]} the list of items
     */
    toArray() {
      let result = [];
      for (let priority of this.__sortedKeys()) {
        result.push(...this.__items.get(priority));
      }
      return result;
    },

    __sortedKeys() {
      return [...this.__items.keys()].sort((a, b) => a - b);
    }
  }
});
