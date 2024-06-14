import fs from "node:fs";
import path from "node:path";
import { Command } from "commander";
import { log } from "../_stdio";
import { logTitle, logAndRunCommand, logError } from "./helpers";

export const addBuildCmd = (cmd: Command) => {
  cmd
    .command("build")
    .description("Build contract.")
    .option(
      "--ignore <IGNORE>",
      `Ignore all directories matching the RegExp (default: ${defaultIgnore})`,
    )
    .option(
      "--locked",
      "Require the Cargo.lock in the wasm crate to be up to date",
    )
    .option(
      "--dir <DIR>",
      "Directory in which the command is executed (default: $(PWD))",
    )
    .option("-r, --recursive", "Build all contracts under the directory")
    .option(
      "--target-dir <TARGET_DIR>",
      "Target directory used by Rust compiler (default: $(PWD)/target)",
    )
    .action(action);
};

const action = ({
  ignore,
  locked,
  dir,
  recursive,
  targetDir,
}: {
  ignore?: string;
  locked?: boolean;
  dir?: string;
  recursive?: boolean;
  targetDir?: string;
}) => {
  dir = dir ?? process.cwd();
  targetDir = targetDir ?? path.join(process.cwd(), "target");
  const dirs: string[] = [];
  if (recursive) {
    const ignoreRegex = new RegExp(ignore ?? defaultIgnore);
    dirs.push(...findBuildableDirs(dir, ignoreRegex));
  } else {
    if (isDirBuildable(dir)) {
      dirs.push(dir);
    }
  }
  if (dirs.length === 0) {
    logError("No valid contract found.");
    return;
  }
  const args = ["run", "--target-dir", targetDir, "build"];
  if (locked) {
    args.push("--locked");
  }
  args.push("--target-dir", targetDir);
  const numDirs = dirs.length;
  logTitle(`Building contract${numDirs > 1 ? "s" : ""}...`);
  for (const [i, dir] of dirs.entries()) {
    log(`(${i + 1}/${numDirs}) Building "${path.resolve(dir)}"...`);
    logAndRunCommand("cargo", args, { cwd: path.join(dir, "meta") });
  }
};

const findBuildableDirs = (startDir: string, ignoreRegex: RegExp) => {
  const results: string[] = [];
  if (isDirBuildable(startDir)) {
    results.push(startDir);
  } else {
    const files = fs.readdirSync(startDir);
    for (const file of files) {
      const p = path.join(startDir, file);
      if (fs.statSync(p).isDirectory()) {
        if (ignoreRegex.test(file)) continue;
        results.push(...findBuildableDirs(p, ignoreRegex));
      }
    }
  }
  return results;
};

const isDirBuildable = (p: string) => {
  const mvxJsonPath = path.join(p, "multiversx.json");
  const mvxJsonFileExists =
    fs.existsSync(mvxJsonPath) && fs.statSync(mvxJsonPath).isFile();
  const elrondJsonPath = path.join(p, "elrond.json");
  const elrondJsonFileExists =
    fs.existsSync(elrondJsonPath) && fs.statSync(elrondJsonPath).isFile();
  const metaPath = path.join(p, "meta");
  const metaDirExists =
    fs.existsSync(metaPath) && fs.statSync(metaPath).isDirectory();
  return (mvxJsonFileExists || elrondJsonFileExists) && metaDirExists;
};

const defaultIgnore = "^(target|node_modules|(\\..*))$";
