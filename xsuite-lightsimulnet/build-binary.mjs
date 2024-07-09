import assert from "node:assert";
import { $, cd, minimist } from "zx";

const argv = minimist(process.argv.slice(2));

if (process.env.CI) {
  assert.deepStrictEqual(await $`go env GOOS GOARCH`.lines(), [
    argv.os,
    argv.arch,
  ]);
}

cd("src");
await $`go build -o ../../xsuite-lightsimulnet-${argv.os}-${argv.arch}/bin/lsproxy -ldflags ${argv.ldflags}`;
