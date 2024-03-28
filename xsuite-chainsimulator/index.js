const path = require("node:path");

function getChainSimulatorBinPath() {
  switch (process.platform) {
    case 'linux':
      return path.join(__dirname, 'bin', 'chainsimulator-linux-amd64');
    case "darwin":
      return path.join(__dirname, "bin", "chainsimulator-darwin-amd64");
    default:
      throw new Error(`Unsupported platform: ${process.platform}`);
  }
}

function getChainSimulatorDefaultConfigFolder() {
  return path.join(__dirname, 'config');
}

module.exports = { getChainSimulatorBinPath, getChainSimulatorDefaultConfigFolder };
