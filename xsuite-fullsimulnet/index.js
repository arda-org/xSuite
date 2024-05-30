const path = require("node:path");

function getFsproxyBinPath() {
  if (process.platform === "linux" && process.arch === "x64") {
    return require.resolve("@xsuite/full-simulnet-linux-amd64/bin/fsproxy");
  } else if (process.platform === "darwin" && process.arch === "x64") {
    return require.resolve("@xsuite/full-simulnet-darwin-amd64/bin/fsproxy");
  } else {
    throw new Error(`Unsupported config: ${process.platform} ${process.arch}`);
  }
}

function getFsproxyConfigPath() {
  return path.join(__dirname, "config");
}

module.exports = { getFsproxyBinPath, getFsproxyConfigPath };
