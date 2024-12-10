qx.Class.define("zx.demo.work.dockerPeer.App", {
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

      let schedulerClientTransport = new zx.io.api.transport.loopback.Client();
      let schedulerServerTransport = new zx.io.api.transport.loopback.Server();
      schedulerClientTransport.connect(schedulerServerTransport);
      schedulerServerTransport.connect(schedulerClientTransport);
      let schedulerClient = new zx.work.api.SchedulerClientApi(schedulerClientTransport, "/scheduler");
      let schedulerServer = new zx.work.api.SchedulerServerApi("/scheduler");
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
