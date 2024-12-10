qx.Class.define("zx.demo.remoteapi.srv.ServerApp", {
  extend: qx.application.Basic,
  construct() {
    super();
  },
  properties: {},
  objects: {},
  members: {
    async main() {
      let transport = new zx.io.api.server.ExpressServerTransport();
      let connectionManager = zx.io.api.ConnectionManager.getInstance();
      connectionManager.registerApi(new zx.demo.remoteapi.PlayerMediaServerApi(), "/player/media");
      connectionManager.registerApi(new zx.demo.remoteapi.WifiServerApi(), "/player/wifi/");
    }
  }
});
