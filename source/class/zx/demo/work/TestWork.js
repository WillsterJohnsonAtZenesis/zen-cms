qx.Class.define("zx.demo.work.TestWork", {
  extend: zx.work.AbstractWork,

  members: {
    async execute(log) {
      log("Hello, World!");
      log("Lorem ipsum dolor sit amet, consectetur adipiscing elit.");
      // TODO: anything!
      return "success!";
    }
  }
});
