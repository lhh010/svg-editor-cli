exports.default = {
  name: "fx-throws",
  activate() { throw new Error("boom during activate"); }
};
