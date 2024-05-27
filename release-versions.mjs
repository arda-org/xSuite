#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { $, question } from "zx";

const updatedFiles = [];
const updatedPkgs = [];

const getPkgJsonPath = (pkgDir) =>
  path.join(import.meta.dirname, pkgDir, "package.json");

const releaseVersion = async (versionPkgDir, ...additionalPkgDirs) => {
  const versionPkgJsonPath = getPkgJsonPath(versionPkgDir);
  const versionPkgJson = JSON.parse(fs.readFileSync(versionPkgJsonPath));
  const { name, version } = versionPkgJson;
  const newVersion = await question(`${name}@${version}. New version: `);
  if (!newVersion) {
    console.log("  Skipped.");
    return;
  }
  for (const pkgDir of [versionPkgDir, ...additionalPkgDirs]) {
    const pkgJsonPath = getPkgJsonPath(pkgDir);
    const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath));
    pkgJson.version = newVersion;
    fs.writeFileSync(pkgJsonPath, JSON.stringify(pkgJson, null, 2) + "\n");
    updatedFiles.push(pkgJsonPath);
    updatedPkgs.push(`${name}@${newVersion}`);
  }
};

await releaseVersion("xsuite-lightsimulnet");
await releaseVersion("xsuite");

if (updatedFiles.length > 0) {
  await $`git add ${updatedFiles}`;
  await $`echo "Release ${updatedPkgs}" > commit_message.txt`;
  await $`code --wait commit_message.txt`;
  await $`git commit -m ${fs.readFileSync("commit_message.txt")}`;
  fs.unlinkSync("commit_message.txt");
}
