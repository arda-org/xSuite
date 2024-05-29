import { $, cd, minimist } from "zx";

const argv = minimist(process.argv.slice(2));

cd("src");
await $`GOOS=${argv.os} GOARCH=${argv.arch} go build -o ../../xsuite-lightsimulnet-${argv.os}-${argv.arch}/bin/lsproxy -ldflags ${argv.ldflags}`;
