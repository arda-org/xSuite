const path = require("node:path");

function getFsproxyBinPath() {
  switch (process.platform) {
    case "linux":
      return require.resolve("@xsuite/full-simulnet-linux-amd64/bin/fsproxy");
    case "darwin":
      return require.resolve("@xsuite/full-simulnet-darwin-amd64/bin/fsproxy");
    default:
      throw new Error(`Unsupported platform: ${process.platform}`);
  }
}

function getFsproxyConfigPath() {
  return path.join(__dirname, "config");
}

module.exports = { getFsproxyBinPath, getFsproxyConfigPath };
