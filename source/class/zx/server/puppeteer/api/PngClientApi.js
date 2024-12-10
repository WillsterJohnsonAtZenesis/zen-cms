qx.Class.define("zx.server.puppeteer.api.PngClientApi", {
  extend: zx.io.api.AbstractClientApi,
  construct(transport, uri) {
    super(transport, ["next"], uri);
  }
});
