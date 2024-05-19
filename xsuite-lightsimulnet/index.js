const path = require("node:path");

function getLsproxyBinPath() {
  switch (process.platform) {
    case "linux":
      return path.join(__dirname, "bin", "lsproxy-linux-amd64");
    case "darwin":
      return path.join(__dirname, "bin", "lsproxy-darwin-amd64");
    default:
      throw new Error(`Unsupported platform: ${process.platform}`);
  }
}

module.exports = { getLsproxyBinPath };
