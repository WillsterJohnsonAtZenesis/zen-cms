qx.Class.define("zx.demo.remoteapi.BrowserTransportServer", {
  extend: zx.io.api.transport.AbstractServerTransport,

  construct(client) {
    super();
    this.__client = client;
  },

  members: {
    supportsServerPush() {
      return true;
    },

    postMessage(data) {
      if (this.__client) {
        setTimeout(() => this.__client.receiveMessage(data), 1);
      }
    },

    /**
     * @override
     */
    createPushResponse(session) {
      return new zx.io.api.ServerResponse();
    },

    sendPushResponse(response) {
      this.postMessage(response.toNativeObject());
    },

    setClient(client) {
      this.__client = client;
    },

    async receiveMessage({ uri, data }) {
      let request = new zx.io.api.ServerRequest(this, data);
      let response = new zx.io.api.ServerResponse();
      await zx.io.api.ConnectionManager.getInstance().receiveMessage(request, response);
      this.postMessage(response.toNativeObject());
    }
  }
});
