/**
 * The session manager is responsible for keeping a registry of active sessions
 * and killing sessions which have been inactive for too long.
 */
qx.Class.define("zx.io.api.SessionManager", {
  extend: qx.core.Object,
  type: "singleton",

  construct() {
    super();
    /**
     * @type {{[uuid: string]: zx.io.api.ServerSession}}
     */
    this.__sessionByUuid = {};

    //sweeper for finding and killing sessions that have been inactive for too long
    const killSessionsLoop = () => {
      setTimeout(() => {
        this.__killOldSessions();
        killSessionsLoop();
      }, this.constructor.KILL_OLD_SESSIONS_INTERVAL);
    };

    killSessionsLoop();
  },

  members: {
    /**
     * Kills sessions which have been inactive for too long
     */
    __killOldSessions() {
      let sessions = new qx.data.Array(this.getAllSessions());
      for (let session of sessions) {
        if (new Date().getTime() - session.getLastActivity().getTime() > this.constructor.SESSION_TIMEOUT) {
          delete this.__sessionByUuid[session.toUuid()];
          session.destroy();
        }
      }
    },

    getSessionByUuid(uuid) {
      return this.__sessionByUuid[uuid];
    },

    getAllSessions() {
      return Object.values(this.__sessionByUuid);
    },

    addSession(session) {
      this.__sessionByUuid[session.toUuid()] = session;
    },

    removeSession(session) {
      delete this.__sessionByUuid[session.toUuid()];
    }
  },
  statics: {
    /**
     * How often to look and kill old sessions
     */
    KILL_OLD_SESSIONS_INTERVAL: 30000,

    /**
     * How inactive a session should be before it is killed
     */
    SESSION_TIMEOUT: 5 * 60 * 1000
  }
});
