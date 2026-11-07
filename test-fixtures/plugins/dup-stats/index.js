class S {
  name = "stats";
  usage = "stats";
  summary = "";
  execute() { return []; }
}
exports.default = {
  name: "fx-dup-stats",
  activate(ctx) { ctx.registerCommand(new S()); }
};
