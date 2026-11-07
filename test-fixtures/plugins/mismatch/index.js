class D { decorate() { return null; } }
exports.default = {
  name: "fx-mismatch",
  activate(ctx) { ctx.registerDecorator("declared-name", new D()); }
};
