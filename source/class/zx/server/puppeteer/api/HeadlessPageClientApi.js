qx.Class.define("zx.server.puppeteer.api.HeadlessPageClientApi", {
  extend: zx.io.api.AbstractClientApi,
  construct(transport, uri) {
    super(transport, ["waitForServer", "run"], uri);
  }
});
