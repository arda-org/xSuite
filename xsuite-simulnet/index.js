const path = require("node:path");

function getSproxyBinPath() {
  switch (process.platform) {
    case "linux":
      return path.join(__dirname, "bin", "sproxy-linux-amd64");
    case "darwin":
      return path.join(__dirname, "bin", "sproxy-darwin-amd64");
    default:
      throw new Error(`Unsupported platform: ${process.platform}`);
  }
}

module.exports = { getSproxyBinPath };
