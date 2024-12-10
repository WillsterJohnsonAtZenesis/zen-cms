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
 * A simple pool for managing unique numbers, eg for TCP ports
 */
qx.Class.define("zx.utils.Range", {
  extend: qx.core.Object,

  /**
   * @param {number} min - the smallest number to generate (inclusive)
   * @param {number} max - the largest number to generate (exclusive)
   */
  construct(min, max) {
    super();
    this.setMin(min);
    this.setMax(max);
    this.__used = new Set();
  },

  properties: {
    min: {
      check: "Number"
    },
    max: {
      check: "Number"
    }
  },

  members: {
    /**@type {Set<number>} */
    __used: null,

    /**
     * Notify the range that this value is no longer in use and may be distributed later
     * @param {number} value
     */
    release(value) {
      this.__used.delete(value);
    },

    /**
     * Retrieve a value from the range. Typically, these are provided in ascending order, but they may be out of order
     * if the range has been saturated. Throws an error if the range is full.
     * @returns {number}
     */
    acquire() {
      let next = this.__last ?? this.getMin();
      if (next >= this.getMax()) {
        next = this.getMin();
      }
      while (this.__used.has(next)) {
        next++;
        if (next === this.__last) {
          throw new Error("Range is full");
        }
        if (next >= this.getMax()) {
          next = this.getMin();
        }
      }
      this.__last = next;
      this.__used.add(next);
      return next;
    }
  }
});
