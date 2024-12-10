qx.Class.define("zx.utils.Uri", {
  type: "static",

  statics: {
    /**
     *
     * @param {string} uri
     * @returns Breaks out this URI into its components
     */
    breakoutUri(uri) {
      const letter = "[a-zA-Z]";
      const fqdn = `${letter}+(\.${letter}+)*`;
      const hostname = `(?<fqdn>${fqdn})(:(?<port>\\d+))?`;
      let regexStr = `((?<protocol>${letter}+):\\/\\/)?(?<hostname>${hostname})?(?<path>\\/.*)`;
      let regex = new RegExp(regexStr);
      let match = regex.exec(uri);
      return {
        fqdn: match.groups.fqdn ?? null,
        protocol: match.groups.protocol ?? null,
        hostname: match.groups.hostname ?? null,
        port: match.groups.port ?? null,
        path: match.groups.path ?? null
      };
    },

    join(base, ...paths) {
      let uri = base;
      for (let path of paths) {
        uri = uri.replace(/\/$/, "") + "/" + path.replace(/^\//, "");
      }
      return uri;
    }
  }
});
