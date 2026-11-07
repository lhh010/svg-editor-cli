class C1 {
  name = "extra-one";
  usage = "extra-one";
  summary = "";
  execute() { return []; }
}
class C2 {
  name = "extra-two";
  usage = "extra-two";
  summary = "";
  execute() { return []; }
}
exports.default = {
  name: "fx-partial-and-dup",
  activate(ctx) {
    ctx.registerCommand(new C1()); // 应随回滚一并撤销
    ctx.registerCommand(new C2()); // 与下一条重复 -> 整个插件回滚
    ctx.registerCommand(new C2());
  }
};
