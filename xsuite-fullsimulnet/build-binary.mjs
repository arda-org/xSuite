import assert from "node:assert";
import { $, minimist } from "zx";

const argv = minimist(process.argv.slice(2));

if (process.env.CI) {
  assert.deepStrictEqual(await $`go env GOOS GOARCH`.lines(), [
    argv.os,
    argv.arch,
  ]);
}

await $`GOBIN="$(pwd)" go install -ldflags ${argv.ldflags} github.com/multiversx/mx-chain-simulator-go/cmd/chainsimulator@v1.7.13-patch1-fix2`;
await $`mv ./chainsimulator ../xsuite-fullsimulnet-${argv.os}-${argv.arch}/bin/fsproxy`;
