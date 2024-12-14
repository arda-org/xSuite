const path = require("node:path");

const fsproxyBinaryPath = (() => {
  const { platform, arch } = process;
  if (
    ["linux", "darwin"].includes(platform) &&
    ["x64", "arm64"].includes(arch)
  ) {
    return require.resolve(
      `@xsuite/full-simulnet-${platform}-amd64/bin/fsproxy`,
    );
  }
  throw new Error(`Unsupported config: ${platform} ${arch}`);
})();

const fsproxyConfigsPath = path.join(__dirname, "config");

module.exports = { fsproxyBinaryPath, fsproxyConfigsPath };
