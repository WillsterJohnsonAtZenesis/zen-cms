/**
 * Connection manager for the server
 * Takes in request from the server transport (zx.io.api.transport.AbstractServerTransport),
 * processes them and populates the response
 */
qx.Class.define("zx.io.api.ConnectionManager", {
  extend: qx.core.Object,
  type: "singleton",

  construct() {
    super();
    this.__apisByPath = {};
  },

  members: {
    /**
     * @type {{ [path: string]: zx.io.api.AbstractServerApi }}
     * Maps path names that the APIs were registered with to the APIs themselves
     */
    __apisByPath: null,

    /**
     * Adds an API, either globally or by path.
     * If a path is provided, incoming requests for that API instance must have their path property (@see zx.io.api.ServerRequest#path) set to that path.
     * They cannot be access solely by their API name in the request's header.
     *
     * @param {(new () => zx.io.api.AbstractServerApi) | zx.io.api.AbstractServerApi} api API class or instance
     * @param {String?} path Optional path to register the API under
     */
    registerApi(api, path) {
      if (!(api instanceof qx.core.Object)) {
        api = new api();
      }
      if (this.__apisByPath[path]) {
        throw new Error(`API with path ${path} already registered`);
      }
      this.__apisByPath[path] = api;
      api.setPath(path);
    },

    /**
     * Call this method by your transport (IServerTransport) after it receives a message.
     *
     * This method will serve the request, and then populate the response object.
     * Your transport should then take the data from the response object and send it back to the client,
     * which is transport dependent i.e. a websocket transport would simply push the data back,
     * while a HTTP transport would send the data back in the response to its request.
     *
     * @param {zx.io.api.ServerRequest} request
     * @param {zx.io.api.ServerResponse} response
     */
    async receiveMessage(request, response) {
      let isPoll = request.getType() === "poll";
      let api;

      if (!isPoll) {
        for (let [apiPath, apiObject] of Object.entries(this.__apisByPath)) {
          if (request.getPath().startsWith(apiPath)) {
            api = apiObject;
            break;
          }
        }
      }

      if (!isPoll) {
        if (api) {
          let responseData = await api.receiveMessage(request);
          responseData.headers ??= {};
          responseData.headers["Server-Api-Uuid"] = api.toUuid();
          responseData.headers["Client-Api-Uuid"] = request.getHeader("Client-Api-Uuid");
          response.addData(responseData);
        } else {
          throw new Error(`API for path ${request.getPath()} not found`);
        }
      }

      //Session
      let session = request.getSession();

      //Get any queued publications from the session
      //publications are queued if the transport does not support server push e.g. HTTP
      if (session) {
        session.setLastActivity(new Date());
        for (let publication of session.consumePublicationsQueue()) {
          console.log("Sending publication to transport", { publication, session });
          response.addData(publication);
        }
      }
    },

    /**
     * Pushes any pending publications in a session to its transport, for a given particular API
     * Called EXCLUSIVELY by the session class (zx.io.api.ServerSession) when it wants to publish
     * NOTE: This method is only called when the session's transport supports server push!
     * @param {zx.io.api.ServerSession} session
     * @param {zx.io.api.AbstractServerApi} api
     */
    flushPublicationsQueue(session) {
      let transport = session.getTransport();
      for (let publication of session.consumePublicationsQueue()) {
        transport.postMessage(null, publication);
      }
    }
  }
});
