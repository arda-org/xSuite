const path = require("node:path");

function getFproxyBinPath() {
  switch (process.platform) {
    case "linux":
      return path.join(__dirname, "bin", "fproxy-linux-amd64");
    case "darwin":
      return path.join(__dirname, "bin", "fproxy-darwin-amd64");
    default:
      throw new Error(`Unsupported platform: ${process.platform}`);
  }
}

module.exports = { getFproxyBinPath };
