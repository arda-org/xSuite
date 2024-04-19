#!/bin/sh

VERSION="v1.7.5"

GOBIN="$(pwd)/bin" go install -ldflags "-extldflags '-Wl,-rpath,@loader_path'" github.com/multiversx/mx-chain-simulator-go/cmd/chainsimulator@${VERSION}
mv ./bin/chainsimulator bin/"${BINARY}"
