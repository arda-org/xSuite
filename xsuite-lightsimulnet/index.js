function getLsproxyBinPath() {
  if (process.arch === "x64" || process.arch === "arm64") {
    if (process.platform === "linux") {
      return require.resolve("@xsuite/light-simulnet-linux-amd64/bin/lsproxy");
    } else if (process.platform === "darwin") {
      return require.resolve("@xsuite/light-simulnet-darwin-amd64/bin/lsproxy");
    }
  }
  throw new Error(`Unsupported config: ${process.platform} ${process.arch}`);
}

module.exports = { getLsproxyBinPath };
