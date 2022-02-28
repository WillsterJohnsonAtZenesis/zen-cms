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

qx.Class.define("zx.test.io.remote.DummyNetworkEndpoint", {
  extend: zx.io.remote.NetworkEndpoint,

  members: {
    _flushImpl(queuedPackets) {
      queuedPackets.forEach(packet => {
        let promise = this._pendingPromises[packet.packetId];

        if (promise) {
          promise.resolve();
        }
      });
    }
  }
});
