function getLsproxyBinPath() {
  switch (process.platform) {
    case "linux":
      return require.resolve("@xsuite/light-simulnet-linux-amd64/bin/lsproxy");
    case "darwin":
      return require.resolve("@xsuite/light-simulnet-darwin-amd64/bin/lsproxy");
    default:
      throw new Error(`Unsupported platform: ${process.platform}`);
  }
}

module.exports = { getLsproxyBinPath };
