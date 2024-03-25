TARGET_DIR="$(pwd)/../target"

SOURCE_DIR="$(pwd)/contracts"
DEST_DIR="/tmp/xsuite-contracts"

rm -rf $TARGET_DIR
rm -rf $DEST_DIR
cp -R $SOURCE_DIR $DEST_DIR

pnpm xsuite build-reproducible --image multiversx/sdk-rust-contract-builder:v6.1.1 --dir $DEST_DIR --output-dir $TARGET_DIR --no-docker-tty --no-docker-interactive

cd $TARGET_DIR

shopt -s globstar dotglob

for file in **/*.wasm
do
  if [ -f "$file" ]; then
    filename=$(basename "$file")
    filenameWithoutExtension=$(basename -- "$file" .wasm)
    destination="$SOURCE_DIR/$filenameWithoutExtension/output/$filename"
    mkdir -p "$(dirname "$destination")"
    cp "$file" "$destination"
  fi
done

shopt -u globstar dotglob
