const path = require("node:path");

const fsproxyBinaryPath = (() => {
  if (process.arch === "x64" || process.arch === "arm64") {
    if (process.platform === "linux") {
      return require.resolve("@xsuite/full-simulnet-linux-amd64/bin/fsproxy");
    } else if (process.platform === "darwin") {
      return require.resolve("@xsuite/full-simulnet-darwin-amd64/bin/fsproxy");
    }
  }
  throw new Error(`Unsupported config: ${process.platform} ${process.arch}`);
})();

const fsproxyConfigsPath = path.join(__dirname, "config");

module.exports = { fsproxyBinaryPath, fsproxyConfigsPath };
