#/bin/sh

REPOSRC="git@github.com:multiversx/mx-chain-simulator-go.git"

if [ ! -d $LOCALREPO_VC_DIR ]
then
    git clone $REPOSRC
else
    cd mx-chain-simulator-go
    git pull $REPOSRC
    cd ..
fi

cd mx-chain-simulator-go/cmd/chainsimulator

if [ "$PLATFORM" = "darwin" ]; then
  echo 'Building darwin binary...'
  export GOOS=darwin GOARCH=amd64
  go install
  go build -o ../../../bin/chain-simulator-darwin-amd64 -ldflags "-extldflags '-Wl,-rpath,@loader_path'"
else
  echo 'Building linux binary...'
  export GOOS=linux GOARCH=amd64
  go install
  go build -o ../../../bin/chain-simulator-linux-amd64 -ldflags "-extldflags '-Wl,-rpath,\$ORIGIN'"
fi

echo 'Binary built!'
