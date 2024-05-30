function getLsproxyBinPath() {
  if (process.platform === "linux" && process.arch === "x64") {
    return require.resolve("@xsuite/light-simulnet-linux-amd64/bin/lsproxy");
  } else if (process.platform === "darwin" && process.arch === "x64") {
    return require.resolve("@xsuite/light-simulnet-darwin-amd64/bin/lsproxy");
  } else {
    throw new Error(`Unsupported config: ${process.platform} ${process.arch}`);
  }
}

module.exports = { getLsproxyBinPath };
