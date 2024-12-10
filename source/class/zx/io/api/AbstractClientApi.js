/**
 * Base class for client-side API implementations
 *
 * @typedef {Object} MethodConfig Configuration for a method in the API
 */
qx.Class.define("zx.io.api.AbstractClientApi", {
  type: "abstract",
  extend: qx.core.Object,

  /**
   *
   * @param {zx.io.api.transport.AbstractClientTransport} transport The transport object that this API class sends and receives data
   *
   * @param {string[] | { [methodName: string]: MethodConfig }} methodNames
   * Either: Names of the methods that are defined in the corresponding server API class.
   * Or: An object mapping method names to their configurations.
   *
   * @param {string} uri The URI of the server API
   */
  construct(transport, methodNames, uri) {
    super();

    this.__uri = uri;
    this.__transport = transport;
    this.__cookies = {};
    this.__pendingMethodCalls = {};
    this.__transport.addListener("message", evt => this.__onMessage(evt.getData()), this);
    this.__methodConfigs = {};
    this.__subscriptions = {};

    if (methodNames) {
      if (qx.lang.Type.isArray(methodNames)) {
        methodNames.forEach(methodName => this.__addMethod(methodName));
      } else {
        for (let methodName in methodNames) {
          this.__addMethod(methodName, methodNames[methodName]);
        }
      }
    }
  },

  members: {
    /**
     * @type {string}
     */
    __uri: null,

    /**
     * @typedef {{callbacks: ((eventData: any) => void)[], promise: qx.Promise?}} SubscriptionData The promise is created when the client requests subscribe,
     * and resolved when the client receives a message from the server that it has subscribed to the event.
     * The callback is called when the server publishes the event.
     * @type {{[eventName: string]: SubscriptionData}}
     *
     * A map mapping event names for subscriptions to their callbacks
     */
    __subscriptions: null,

    /**
     * @type {zx.io.api.transport.AbstractClientTransport}
     */
    __transport: null,

    /**
     * @interface PendingMethodCall Data representing a call for a server method that we are waiting for a response for
     * @property {qx.Promise} promise A promise that will be resolved when the server responds to the method call
     * @property {number} callIndex A unique identifier for the call
     * @property {string} methodName Name of method in the server API class
     * @property {any[]} methodArgs Arguments passed to server method
     *
     * @type {PendingMethodCall[]}
     */
    __pendingMethodCalls: null,

    /**
     * The call index of the last method call that was made.
     * If no calls have been made yet, it's 0.
     */
    __pendingMethodCallIndex: 0,

    /**
     * @type {Object}
     */
    __cookies: null,

    /**
     * @type {[methodName: string]: Object}
     * A map storing the configuration for each method in the API.
     */
    __methodConfigs: null,

    /**
     * Creates a subscription to a publication fired by the server API

     * NOTE: You must await this method the first time you call it in a client API instance,
     * otherwise it will cause problems with session tracking.
     *
     * @param {string} eventName
     * @param {(data: any) => void} callback
     * @param {object} context - if provided, the callback will be replaced; `callback.bind(context)`
     * @returns {qx.Promise<boolean>} A promise that will be resolved with true when the subscription succeeded or false when failed.
     * A subscription can fail if we lose connection to the server.
     */
    subscribe(eventName, callback, context) {
      if (context) {
        callback = callback.bind(context);
      }
      if (this.__subscriptions[eventName]) {
        this.__subscriptions[eventName].callbacks.push(callback);
        return;
      }

      let headers = {
        "Client-Api-Uuid": this.toUuid()
      };

      if (this.__transport.getSessionUuid(this.__getHostname())) {
        headers["Session-Uuid"] = this.__transport.getSessionUuid(this.__getHostname());
      }

      this.__transport.postMessage(this.__uri, {
        type: "subscribe",
        headers,
        path: this.__getPath(),
        body: {
          eventName
        }
      });

      let promise = new qx.Promise();
      this.__transport.subscribed(this.__uri);
      let callbacks = new qx.data.Array([callback]);
      this.__subscriptions[eventName] = { callbacks, promise };
      return promise;
    },

    /**
     * Removes a subscription from a publication fired by the server API
     * @param {string} eventName
     * @param {(data: any) => void} callback
     */
    unsubscribe(eventName, callback) {
      let { callbacks } = this.__subscriptions[eventName];
      if (callback) {
        callbacks.remove(callback);
      } else {
        callbacks.removeAll();
      }

      if (callbacks.length == 0) {
        delete this.__subscriptions[eventName];
        let request = {
          type: "unsubscribe",
          headers: {
            "Client-Api-Uuid": this.toUuid(),
            "Session-Uuid": this.__transport.getSessionUuid(this.__getHostname())
          },
          body: {
            eventName
          }
        };
        this.__transport.postMessage(this.__uri, request);
        this.__transport.unsubscribed(this.__uri);
      }
    },

    /**
     * Adds a remote method
     *
     * @param {String} methodName
     * @param {MethodConfig} methodConfig
     */
    __addMethod(methodName, methodConfig) {
      if (typeof methodName != "string" && !methodConfig && typeof methodName.methodName == "string") {
        methodConfig = methodName;
        methodName = methodConfig.methodName;
      } else {
        methodConfig = methodConfig || {};
        methodConfig.methodName = methodName;
      }
      this.__methodConfigs[methodName] = methodConfig || {};
      this[methodName] = (...args) => this._callMethod(methodName, args);
    },

    /**
     * Called when a server method has been called on an instance of this class
     * @param {string} methodName
     * @param {any[]} methodArgs Arguments that will be passed to the server method
     * @returns {qx.Promise} A promise that will be resolved when the server responds to the method call
     */
    _callMethod(methodName, methodArgs) {
      let promise = new qx.Promise();
      let pending = {
        promise,
        callIndex: ++this.__pendingMethodCallIndex,
        methodName,
        methodArgs
      };
      this.__pendingMethodCalls[pending.callIndex] = pending;
      let headers = {
        "Call-Index": pending.callIndex, //linebreak
        "Client-Api-Uuid": this.toUuid(),
        Cookies: JSON.stringify(this.__cookies)
      };

      const sessionUuid = this.__transport.getSessionUuid(this.__getHostname());
      if (sessionUuid) {
        headers["Session-Uuid"] = sessionUuid;
      }

      try {
        this.__transport.postMessage(this.__getUrl(methodName), {
          type: "callMethod",
          headers,
          path: this.__getPath(methodName),
          body: {
            methodArgs
          }
        });
      } catch (e) {
        delete this.__pendingMethodCalls[pending.callIndex];
        promise.reject(e);
      }
      return promise;
    },

    /**
     * Called when a message is received from the server by the transport
     * @param {zx.io.api.IResponseJson} message
     */
    __onMessage(message) {
      for (let data of message.data) {
        this.__processData(data);
      }
    },

    /**
     * Process an item of a message data, depending on its type
     * @param {zx.io.api.IResponseJson.IResponseData} data
     */
    __processData(data) {
      //Ignore messages that are not for this API
      if (data.headers["Client-Api-Uuid"] != this.toUuid()) {
        return;
      }

      //Cookies
      let newCookies = data.headers["Cookies"];
      if (newCookies) {
        for (let cookie of newCookies) {
          if (cookie.delete === true) {
            delete this.__cookies[cookie];
          } else {
            this.__cookies[cookie] = cookie;
          }
        }
      }

      //Session UUID
      if (data.headers["Session-Uuid"]) {
        this.__transport.setSessionUuid(this.__getHostname(), data.headers["Session-Uuid"]);
      }

      if (data.type == "methodReturn") {
        //Find the pending method call promise and either resolve or reject it
        let callIndex = data.headers["Call-Index"];
        if (!callIndex) {
          throw new Error("No CallIndex in return message");
        }
        let pending = this.__pendingMethodCalls[callIndex];
        if (pending) {
          delete this.__pendingMethodCalls[callIndex];
          if (data.body.error) {
            pending.promise.reject(data.body.error);
          } else {
            pending.promise.resolve(data.body.methodResult);
          }
        }
      } else if (data.type == "subscribed") {
        this.__subscriptions[data.body.eventName].promise.resolve();
        delete this.__subscriptions[data.body.eventName].promise;
      } else if (data.type == "unsubscribed") {
        return;
      } else if (data.type == "publish") {
        if (!this.__subscriptions[data.body.eventName]) {
          return;
        }
        this.__subscriptions[data.body.eventName].callbacks.forEach(cb => cb(data.body.eventData));
      } else if (data.type == "shutdown") {
        this.warn("TODO shutdown not implemented");
      } else {
        throw new Error("Unexpected message type: " + data.type);
      }
    },

    /**
     * Returns a URL for a method call,
     * consisting of the API URI and the method name
     *
     * For example;
     * if this.__uri is "http://example.com/api" and methodName is "doSomething" then this method will return
     * "http://example.com/api/doSomething"
     *
     * @param {string} methodName
     * @returns
     */
    __getUrl(methodName) {
      return zx.utils.Uri.join(this.__uri, qx.lang.String.hyphenate(methodName));
    },

    /**
     *
     * @returns {string} The hostname part of this URI
     *
     * For example, if this.__uri is "http://example.com/api",
     * this method will return "example.com"
     */
    __getHostname() {
      if (!this.__uri) {
        return null;
      }

      let out = zx.utils.Uri.breakoutUri(this.__uri).hostname;
      return out;
    },

    __clearSubscriptions() {
      this.__subscriptions = {};
      //todo resolve all pending promises with error
    },

    /**
     * Returns the path of the API, optionally with a method name appended
     * @param {string?} methodName
     * @returns {string?}
     */
    __getPath(methodName) {
      let apiPath = null;
      if (this.__uri) {
        apiPath = zx.utils.Uri.breakoutUri(this.__uri).path;
      }

      if (methodName) {
        apiPath = zx.utils.Uri.join(apiPath ?? "/", methodName);
      }

      return apiPath;
    }
  }
});
