const express = require("express");

qx.Class.define("zx.demo.work.remoteDocker.SchedulerApp", {
  extend: qx.application.Basic,
  implement: [qx.application.IApplication],

  objects: {
    app() {
      const app = express();
      app.use(zx.io.api.transport.http.ExpressServer.jsonMiddleware());
      return app;
    }
  },

  members: {
    async main() {
      let app = this.getQxObject("app");
      new zx.io.api.transport.http.ExpressServer(app, "/zx.work");
      let schedulerServer = new zx.work.api.SchedulerServerApi("/scheduler");
      schedulerServer.schedule({
        uuid: "uuid",
        classname: zx.demo.work.TestWork.classname,
        compatibility: [],
        args: []
      });
      // TODO: add loads more worker which do real stuff, including a worker which goes to 'google.com' and takes a screenshot
      schedulerServer.addListener("complete", e => {
        console.log('schedulerServer.addListener("complete")', e.getData());
      });
      app.listen(4001, () => console.log(`Scheduler server is running on port ${4001}`));
    },

    finalize() {},

    close() {},

    terminate() {}
  }
});
