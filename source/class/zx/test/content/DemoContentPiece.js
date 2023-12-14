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

qx.Class.define("zx.test.content.DemoContentPiece", {
  extend: zx.cms.content.Piece,

  properties: {
    content: {
      init: "",
      check: "String",
      event: "changeContent",
      "@": zx.io.persistence.anno.Property.DEFAULT
    },

    mustNotBeThree: {
      init: 0,
      nullable: false,
      check: "Integer",
      apply: "_applyMustNotBeThree",
      async: true
    }
  },

  members: {
    _applyMustNotBeThree(value) {
      return new qx.Promise((resolve, reject) => {
        setTimeout(() => {
          if (value == 3) {
            reject("Must Not Be Three!!");
          } else resolve();
        }, 100);
      });
    }
  }
});
