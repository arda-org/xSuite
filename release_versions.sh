#!/usr/bin/env bash

root_dir="$(dirname "$(dirname "$0")")"
modified_files=()
updated_modules=()

release_version() {
  local module=$1

  package_json="$root_dir/$module/package.json"
  old_version=$(jq -r ".version" "$package_json")

  echo -n "$module@$old_version. New version: "
  read version

  if [ -z "$version" ]; then
    echo "  Skipped."
  else
    jq ".version = \"${version}\"" "$package_json" > tmp.$$.json && mv tmp.$$.json "$package_json"
    modified_files+=("$package_json")
    updated_modules+=("$module@$version")
  fi
}

release_version "xsuite-fproxy"

release_version "xsuite"

release_version "xsuite-cli"

if [ ${#modified_files[@]} -ne 0 ]; then
  for file in "${modified_files[@]}"; do
    git add "$file"
  done
  updated_modules_string=$( IFS=' '; echo "${updated_modules[*]}" )
  echo "Release $updated_modules_string" > commit_message.txt
  code --wait commit_message.txt
  git commit -m "$(<commit_message.txt)"
  rm commit_message.txt
fi
