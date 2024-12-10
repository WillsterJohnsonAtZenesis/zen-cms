qx.Class.define("zx.demo.remoteapi.PlayerMediaClientApi", {
  extend: zx.io.api.AbstractClientApi,
  construct(transport, uri) {
    super(transport, ["getCurrentMedia", "playMedia"], uri);
  },
  properties: {},
  objects: {},
  members: {}
});
