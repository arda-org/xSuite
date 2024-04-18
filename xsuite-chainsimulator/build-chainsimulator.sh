#!/bin/sh

VERSION="v1.7.5"

if [ "$PLATFORM" = "darwin" ]; then
  echo 'Building darwin binary...'
  GOBIN="$(pwd)/bin" go install -ldflags "-extldflags '-Wl,-rpath,@loader_path'" github.com/multiversx/mx-chain-simulator-go/cmd/chainsimulator@${VERSION}
  mv ./bin/chainsimulator bin/csproxy-darwin-amd64
else
  echo 'Building linux binary...'
  GOBIN="$(pwd)/bin" go install -ldflags "-extldflags '-Wl,-rpath,@loader_path'" github.com/multiversx/mx-chain-simulator-go/cmd/chainsimulator@${VERSION}
  mv ./bin/chainsimulator bin/csproxy-linux-amd64
fi

echo 'Binary built!'
