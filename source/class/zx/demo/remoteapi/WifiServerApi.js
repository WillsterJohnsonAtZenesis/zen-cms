qx.Class.define("zx.demo.remoteapi.WifiServerApi", {
  extend: zx.io.api.AbstractServerApi,
  construct() {
    super("zx.demo.remoteapi.WifiApi");

    this.__interval = setInterval(() => {
      this.publish("changeOnlineStatus", this.__onlineStatus++);
    }, 1000);
  },
  properties: {},
  objects: {},
  members: {
    /**@override */
    _publications: {
      changeOnlineStatus: {}
    },

    __onlineStatus: 0,
    isOnline() {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          resolve(this.__onlineStatus);
        }, 1);
      });
    }
  }
});
