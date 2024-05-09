#!/bin/sh

VERSION="v1.7.7"

GOBIN="$(pwd)/bin" go install -ldflags "$2" github.com/multiversx/mx-chain-simulator-go/cmd/chainsimulator@${VERSION}
mv ./bin/chainsimulator bin/"$1"
