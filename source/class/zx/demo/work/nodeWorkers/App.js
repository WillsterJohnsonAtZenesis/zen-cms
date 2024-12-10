qx.Class.define("zx.demo.work.nodeWorkers.App", {
  extend: qx.application.Basic,
  implement: [qx.application.IApplication],

  members: {
    async main() {
      const pool = new zx.work.pool.NodeWorkerPool({
        minSize: 0,
        maxSize: 1
      });

      const schedulerClientTransport = new zx.io.api.transport.loopback.Client();
      const schedulerServerTransport = new zx.io.api.transport.loopback.Server();
      schedulerClientTransport.connect(schedulerServerTransport);
      schedulerServerTransport.connect(schedulerClientTransport);
      const schedulerClient = new zx.work.api.SchedulerClientApi(schedulerClientTransport, "/scheduler");
      const schedulerServer = new zx.work.api.SchedulerServerApi("/scheduler");
      pool.setSchedulerApi(schedulerClient);
      schedulerServer.schedule({
        uuid: "uuid",
        classname: zx.demo.work.TestWork.classname,
        compatibility: [],
        args: []
      });
      schedulerServer.addListener("complete", e => {
        console.log('schedulerServer.addListener("complete")', e.getData());
      });

      await pool.startup();
    },

    finalize() {},

    close() {},

    terminate() {}
  }
});
