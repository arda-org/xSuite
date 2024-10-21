import assert from "node:assert";
import { $, minimist } from "zx";

const argv = minimist(process.argv.slice(2));

if (process.env.CI) {
  assert.deepStrictEqual(await $`go env GOOS GOARCH`.lines(), [
    argv.os,
    argv.arch,
  ]);
}

await $`GOBIN="$(pwd)" go install -ldflags ${argv.ldflags} github.com/multiversx/mx-chain-simulator-go/cmd/chainsimulator@0507df2631a6437ee5ce9dc1e2474c6946c12825`;
await $`mv ./chainsimulator ../xsuite-fullsimulnet-${argv.os}-${argv.arch}/bin/fsproxy`;
