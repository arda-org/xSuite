TARGET_DIR="$(pwd)/../target"

SOURCE_DIR="$(pwd)/contracts"
DEST_DIR="/tmp/xsuite-contracts"

rm -rf $DEST_DIR
cp -R $SOURCE_DIR $DEST_DIR

cd $DEST_DIR

sc-meta all build --locked --target-dir-all $TARGET_DIR

shopt -s globstar dotglob

for file in ./**/*.wasm
do
  if [ -f "$file" ]; then
    destination=$SOURCE_DIR/${file#./}
    mkdir -p "$(dirname "$destination")"
    cp "$file" "$destination"
  fi
done

shopt -u globstar dotglob
