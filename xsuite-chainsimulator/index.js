const path = require("node:path");

function getCsproxyBinPath() {
  switch (process.platform) {
    case 'linux':
      return path.join(__dirname, 'bin', 'csproxy-linux-amd64');
    case "darwin":
      return path.join(__dirname, "bin", "csproxy-darwin-amd64");
    default:
      throw new Error(`Unsupported platform: ${process.platform}`);
  }
}

function getCsproxyDefaultConfigPath() {
  return path.join(__dirname, 'config');
}

module.exports = { getCsproxyBinPath, getCsproxyDefaultConfigPath };
