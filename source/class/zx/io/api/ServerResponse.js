/**
 * Model class representing a response to a request to the server,
 * They are created by the transport class when a message is received from the client
 */
qx.Class.define("zx.io.api.ServerResponse", {
  extend: qx.core.Object,
  construct() {
    super();
    this.__data = [];
    this.setHeaders({});
  },
  properties: {
    /**
     * public readonly
     */
    headers: {
      check: "Object"
    }
  },
  members: {
    /**
     * The data items of this response
     * @type {zx.io.api.IResponseJson.IResponseData[]}
     */
    __data: null,

    /**
     *
     * @returns {zx.io.api.IResponseJson.IResponseData[]}
     */
    getData() {
      return this.__data;
    },

    /**
     *
     * @param {zx.io.api.IResponseJson.IResponseData} data
     */
    addData(data) {
      this.__data.push(data);
    },

    addHeader(key, value) {
      this.getHeaders()[key] = value;
    },

    addHeaders(headers) {
      for (let key in headers) {
        this.addHeader(key, headers[key]);
      }
    },

    /**
     * @returns {zx.io.api.IResponseJson}
     */
    toNativeObject() {
      return {
        data: this.__data
      };
    }
  }
});
