qx.Class.define("zx.demo.remoteapi.PlayerMediaServerApi", {
  extend: zx.io.api.AbstractServerApi,
  construct() {
    super("zx.demo.remoteapi.PlayerMediaApi");

    this.__interval = setInterval(() => {
      this.publish("playingMedia", this.__currentMedia++);
    }, 1000);

    //example addresses: localhost:8090/zx-remote-api/player/media/playMedia/22
    //localhost:8090/zx-remote-api/player/media/testmethod
    //localhost:8090/zx-remote-api/player/media/getCurrentMedia
    this._registerMethod("playMedia", "playMedia/{id}");
  },
  properties: {},
  objects: {},
  members: {
    /**@override */
    _publications: {
      /**
       * @type {number}
       */
      playingMedia: 0
    },

    _methodParams: {
      playMedia: ["id"]
    },

    __currentMedia: 7,

    /**
     * @param {zx.io.api.MethodRequest} req
     */
    getCurrentMedia(req) {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          resolve(this.__currentMedia);
        }, 200);
      });
    },

    /**
     * @param {zx.io.api.MethodRequest} req
     */
    playMedia(req) {
      const { id } = req.getParams();
      console.log(`called playMedia with id ${id}`);
      this.__currentMedia = id;
    },

    testMethod() {
      return "pigs";
    }
  }
});
