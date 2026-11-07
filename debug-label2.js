require("./dist/plugins/plugin-decorator-box-label/label.test").runLabelTests().then(
  () => console.log("FINISHED"),
  (e) => console.log("REJECTED:", e && e.stack ? e.stack.split(String.fromCharCode(10)).slice(0, 6).join(" | ") : e)
);
