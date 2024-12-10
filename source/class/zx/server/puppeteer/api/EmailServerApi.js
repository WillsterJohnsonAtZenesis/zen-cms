qx.Class.define("zx.server.puppeteer.api.EmailServerApi", {
  //actually the client api!
  extend: zx.io.api.AbstractClientApi,
  construct(transport, uri) {
    super(transport,  ["next"], uri);
  }
});
