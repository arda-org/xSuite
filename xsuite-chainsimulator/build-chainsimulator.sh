#!/bin/sh

REPOSRC="git@github.com:multiversx/mx-chain-simulator-go.git"
REPOVERSION="v1.7.1"

if [ ! -d $LOCALREPO_VC_DIR ]
then
    git clone $REPOSRC
    cd mx-chain-simulator-go
    git checkout $REPOVERSION
    cd ..
else
    cd mx-chain-simulator-go
    git pull $REPOSRC
    git checkout $REPOVERSION
    git pull $REPOSRC
    cd ..
fi

cd mx-chain-simulator-go/cmd/chainsimulator

if [ "$PLATFORM" = "darwin" ]; then
  echo 'Building darwin binary...'
  export GOOS=darwin GOARCH=amd64
  go install
  go build -o ../../../bin/chainsimulator-darwin-amd64 -ldflags "-extldflags '-Wl,-rpath,@loader_path'"
else
  echo 'Building linux binary...'
  export GOOS=linux GOARCH=amd64
  go install
  go build -o ../../../bin/chainsimulator-linux-amd64 -ldflags "-extldflags '-Wl,-rpath,\$ORIGIN'"
fi

echo 'Binary built!'
