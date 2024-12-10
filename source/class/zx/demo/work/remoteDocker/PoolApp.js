qx.Class.define("zx.demo.work.remoteDocker.PoolApp", {
  extend: qx.application.Basic,
  implement: [qx.application.IApplication],

  members: {
    async main() {
      let pool = new zx.work.pool.DockerPeerPool("/zx.work", {
        minSize: 0,
        maxSize: 1
      }).set({
        remoteServerRange: new zx.utils.Range(3000, 4000),
        nodeDebugRange: new zx.utils.Range(9000, 10_000)
      });

      let transport = new zx.io.api.transport.http.Client();
      let scheduler = new zx.work.api.SchedulerClientApi(transport, "http://localhost:4001/zx.work/scheduler");
      pool.setSchedulerApi(scheduler);
      await pool.startup();
    },

    finalize() {},

    close() {},

    terminate() {}
  }
});
