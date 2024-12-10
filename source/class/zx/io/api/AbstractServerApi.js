const path = require("path");
/**
 * Abstract class for server-side API
 * Implement methods here that can be called from the client
 */
qx.Class.define("zx.io.api.AbstractServerApi", {
  type: "abstract",
  extend: qx.core.Object,

  /**
   * @typedef {"GET" | "POST" | "PUT" | "DELETE"} HttpVerb
   */

  /**
   *
   * @param {string} apiPath - path of the API
   */
  construct(apiPath) {
    super();
    this.rest = {};
    this.publications ??= {}; // this may be set statically in a child class
    this.__path = apiPath;
    this.__restHandlers = {};
    for (let verb of ["GET", "POST", "PUT", "DELETE"]) {
      this.rest[verb.toLowerCase()] = () => this.__registerEndpoint(verb, ...arguments);
    }
    zx.io.api.ConnectionManager.getInstance().registerApi(this, apiPath);
  },

  members: {
    /**
     * Add restful endpoints to an api. This rest object contains keys 'get', 'post', 'put', 'delete' which are
     * functions that take a path and a handler, and return a function that unregisters the endpoint.
     *
     * The path parameter is relative to the api's mount path, and any leading '/' './' or '../' are ignored.
     *
     * The handler parameter is a function that takes in a {@link zx.io.api.IRestRequest} and returns a value or a
     * promise.
     * If omitted, a default handler is used. The default handler will inspect the first path segment and convert it to
     * camel case, assume this is the name of a method on `this`, and call it. The parameters it will provide to the
     * method are the url parameters as individual arguments, followed by the query parameters as an object.
     * @type {{
     *   [verb: Lowercase<HttpVerb>]: (
     *     path: string,
     *     handler?: (request: zx.io.api.IRestRequest) => any | Promise<any>
     *   ) => () => void
     * }}
     */
    rest: null,

    /**
     * A map of publication names.
     * The values may take any shape (other than `undefined`), though it is recommended for purposes of documentation to
     * use the literal `true`, and use a JSDoc comment to describe the shape of the data for that publication.
     * Override this field in your implementation to define the publications that this API can publish
     * @type {{ [publicationName: string]: any }}
     */
    publications: null,

    /**@type {string}*/
    __path: null,

    /**@type {{ [path: string]: { [restName: RestMethod]: string } }}*/
    __restHandlers: null,

    /**
     * NOTICE: this method ought to be package-private, however as this is not possible it has to be public.
     *
     * To set the path of an api register it with the {@link zx.io.api.ConnectionManager} via the method `registerApi`
     * Setting the path in any other way is likely to cause issues and crashes.
     */
    setPath(path) {
      this.__path = path;
    },

    getPath() {
      return this.__path;
    },

    /**
     *
     * @param {HttpVerb} httpVerb
     * @param {string} path
     * @param {(request: RestRequest) => any | Promise<any>} handler
     * @returns {() => void} A function that unregisters the endpoint
     */
    __registerEndpoint(httpVerb, path, handler) {
      path = path.replace(/^(\.{0,2}\/)*/, ""); // remove leading '/', './', '../'
      this.__restHandlers[path] ??= {};
      this.__restHandlers[path][httpVerb] = handler ?? this.__autoEndpointHandler.bind(this);
      return () => delete this.__restHandlers[path][httpVerb];
    },

    /**
     * Called EXCLUSIVELY by the connection manager (zx.io.api.ConnectionManager) when a message is received from the client.
     * Does the appropriate action, e.g. calling a method or subscribing to a publication.
     * @param {zx.io.api.ServerRequest} request
     * @returns {Promise<zx.io.api.IResponseJson.IResponseData>}
     */
    async receiveMessage(request) {
      let type = request.getType();

      // if the request path extends this api's mount path, we are handling a RESTful request
      // else we are handling an RPC request

      let responseData;
      if (request.getPath() === this.__path) {
        switch (type) {
          case "subscribe":
            responseData = this.__subscribe(request);
            break;
          case "unsubscribe":
            responseData = this.__unsubscribe(request);
            break;
          case "callMethod":
            throw new Error(`Recognised message type 'callMethod' but could not determine the method name from the path`);
          default:
            throw new Error(`Unknown message type: ${type}`);
        }
      } else {
        // get the remainder of the path after the api's mount path
        let remainderPath = path.relative(this.__path ?? "/", request.getPath()).replace(/(^\/|\/$)/g, "");
        // if the remainder contains only a single segment (eg, '<api-path>/my-method'), it may be an RPC call
        if (remainderPath.split("/").length === 1) {
          responseData = await this.__callMethod(request);
        } else {
          responseData = this.__restful(request);
        }
      }

      return responseData;
    },

    /**
     * Calls a method on the server API
     *
     * @param {zx.io.api.server.Request} request
     * @returns {Promise<zx.io.api.IResponseJson.IResponseData>}
     */
    async __callMethod(request) {
      let result = undefined;
      let error = undefined;
      let methodArgs = request.getBody().methodArgs;

      try {
        let methodName = request.getPath().split("/").at(-1);
        methodName = qx.lang.String.camelCase(methodName);
        result = await this[methodName].apply(this, methodArgs);
      } catch (ex) {
        error = ex;
      }

      let responseData = {
        type: "methodReturn",
        headers: {
          "Call-Index": request.getHeaders()["Call-Index"]
        },
        body: {
          methodResult: result,
          error
        }
      };
      return responseData;
    },

    /**
     * Removes a subscription from a particular event
     * @param {zx.io.api.ServerRequest} request
     * @returns {Promise<zx.io.api.IResponseJson.IResponseData>}
     */
    __unsubscribe(request) {
      let eventName = request.getBody().eventName;
      let session = request.createSession();
      let clientApiUuid = request.getHeader("Client-Api-Uuid");
      session.removeSubscription(this, clientApiUuid, eventName);
      let responseData = {
        headers: {
          "Session-Uuid": session.toUuid()
        },
        type: "unsubscribed",
        body: {
          eventName
        }
      };

      return responseData;
    },
    /**
     * Creates a subscription for a particular event
     * @param {zx.io.api.ServerRequest} request
     * @returns {Promise<zx.io.api.IResponseJson.IResponseData>}
     */
    __subscribe(request) {
      let eventName = request.getBody().eventName;
      let session = request.createSession();
      let clientApiUuid = request.getHeader("Client-Api-Uuid");
      session.addSubscription(this, clientApiUuid, eventName);
      let responseData = {
        headers: {
          "Session-Uuid": session.toUuid()
        },
        type: "subscribed",
        body: {
          eventName
        }
      };

      return responseData;
    },

    /**
     * Calls a method on the server API
     *
     * @param {zx.io.api.ServerRequest} request
     * @returns {Promise<zx.io.api.IResponseJson.IResponseData>}
     */
    async __restful(request) {
      let result = undefined;
      let error = undefined;

      function pathToRegex(path) {
        path = path.replace(/\{/g, "(?<");
        path = path.replace(/\}/g, ">[^/]+)");
        return path;
      }

      let requestMethodPath = path.relative(this.__path ?? "/", request.getPath());
      let queryParams = request.getQuery();

      //Try to lookup the method by path
      let realPath;
      for (let methodPath of Object.keys(this.__restHandlers)) {
        let rgx = new RegExp(pathToRegex(methodPath));
        let match = requestMethodPath.match(rgx);
        if (match) {
          realPath = methodPath;
          let pathArgs = match.groups;
          queryParams = qx.lang.Object.mergeWith(queryParams, pathArgs);
          break;
        }
      }

      if (qx.core.Environment.get("qx.debug")) {
        // include the arguments used in API method call if there are any
        if (request.getBody()?.methodArgs?.length) {
          console.warn(`Warning during RESTful call to ${this.classname} on ${realPath}: Method arguments are not supported in RESTful calls`);
        }
      }

      if (!this.__restHandlers[realPath]) {
        throw new Error(`Endpoint ${realPath} does not exist`);
      }
      if (!this.__restHandlers[realPath][request.getRestMethod()]) {
        throw new Error(`Endpoint ${realPath} does not support ${request.getRestMethod()} requests`);
      }
      const handler = this.__restHandlers[realPath][request.getRestMethod()];

      try {
        result = await handler();
      } catch (ex) {
        error = ex;
      }

      let responseData = {
        type: "methodReturn",
        headers: { "Call-Index": request.getHeaders()["Call-Index"] },
        body: {
          methodResult: result,
          error: error?.message
        }
      };
      return responseData;
    },

    /**
     * Call this method to publish all subscribed clients of an event
     * @param {string} eventName
     * @param {any} data
     */
    publish(eventName, data) {
      if (this.publications[eventName] === undefined) {
        this.warn(`Server API ${this.toString()} attempts to publish "${eventName}" but it is not defined in the publications field.`);
        debugger;
      }
      zx.io.api.SessionManager.getInstance()
        .getAllSessions()
        .forEach(session => {
          console.log(`Publishing ${eventName} to ${session}`);
          session.publish(this, eventName, data);
        });
    }
  }
});
