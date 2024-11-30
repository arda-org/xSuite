const lsproxyBinaryPath = (() => {
  const { platform, arch } = process;
  if (
    ["linux", "darmin"].includes(platform) &&
    ["x64", "arm64"].includes(arch)
  ) {
    return require.resolve(
      `@xsuite/light-simulnet-${platform}-amd64/bin/lsproxy`,
    );
  }
  throw new Error(`Unsupported config: ${platform} ${arch}`);
})();

module.exports = { lsproxyBinaryPath };
