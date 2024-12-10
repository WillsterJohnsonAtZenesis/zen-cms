qx.Class.define("zx.demo.remoteapi.WifiClientApi", {
  extend: zx.io.api.AbstractClientApi,
  construct(transport) {
    super(transport, ["isOnline"]);
  }
});
