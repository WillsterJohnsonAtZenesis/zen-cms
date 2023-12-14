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
 *    John Spackman (john.spackman@zenesis.com, @johnspackman)
 *
 * ************************************************************************ */

qx.Class.define("zx.data.Entry", {
  extend: qx.core.Object,

  construct(key, value) {
    super();
    this.set({ key: key, value: value });
  },

  properties: {
    key: {
      nullable: false,
      event: "changeKey"
    },

    value: {
      init: null,
      nullable: true,
      event: "changeValue"
    }
  }
});
