import { $, minimist } from "zx";

const argv = minimist(process.argv.slice(2));

await $`GOBIN="$(pwd)" GOOS=${argv.os} GOARCH=${argv.arch} go install -ldflags ${argv.ldflags} github.com/multiversx/mx-chain-simulator-go/cmd/chainsimulator@v1.7.7`;
await $`mv ./chainsimulator ../xsuite-fullsimulnet-${argv.os}-${argv.arch}/bin/fsproxy`;
