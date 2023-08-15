#!/usr/bin/env bash

root_dir="$(dirname "$(dirname "$0")")"
modified_files=()
updated_modules=()

bump_version() {
  local module=$1

  package_json="$root_dir/$module/package.json"
  version=$(jq -r ".version" "$package_json")
  bump_flag=false

  for dir in contracts/*/; do
    package_json="$root_dir/$dir/package.json"
    if jq -e ".devDependencies[\"$module\"]" $package_json > /dev/null; then
      dep_version=$(jq -r ".devDependencies[\"$module\"]" "$package_json")
      if [ "$version" != "$dep_version" ]; then
        install_flag=true
        bump_flag=true
        jq ".devDependencies[\"$module\"] = \"${version}\"" "$package_json" > tmp.$$.json && mv tmp.$$.json "$package_json"
        modified_files+=("$package_json")
      fi
    fi
  done

  if $bump_flag ; then
    updated_modules+=("$module@$version")
  fi
}

install_flag=false

bump_version "xsuite"

bump_version "xsuite-cli"

if $install_flag ; then
  pnpm install
  modified_files+=("pnpm-lock.yaml")
fi

if [ ${#modified_files[@]} -ne 0 ]; then
  for file in "${modified_files[@]}"; do
    git add "$file"
  done
  updated_modules_string=$( IFS=' '; echo "${updated_modules[*]}" )
  echo "Bump to $updated_modules_string" > commit_message.txt
  code --wait commit_message.txt
  git commit -m "$(<commit_message.txt)"
  rm commit_message.txt
fi
