import fs from "node:fs";
import path from "node:path";
import { log } from "../_stdio";
import { logTitle, logAndRunCommand, logError } from "./helpers";

export const buildAction = ({
  locked,
  dir,
  recursive,
  targetDir,
}: {
  locked?: boolean;
  dir?: string;
  recursive?: boolean;
  targetDir?: string;
}) => {
  const startDir = dir ?? process.cwd();
  const dirs: string[] = [];
  if (recursive) {
    dirs.push(...findBuildableDirs(startDir));
  } else {
    if (isDirBuildable(startDir)) {
      dirs.push(startDir);
    }
  }
  if (dirs.length === 0) {
    logError("No valid contract found.");
    return;
  }
  const args = ["run"];
  if (targetDir !== undefined) {
    args.push("--target-dir", targetDir);
  }
  args.push("build");
  if (locked) {
    args.push("--locked");
  }
  if (targetDir !== undefined) {
    args.push("--target-dir", targetDir);
  }
  const numDirs = dirs.length;
  logTitle(`Building contract${numDirs > 1 ? "s" : ""}...`);
  for (const [i, dir] of dirs.entries()) {
    log(`(${i + 1}/${numDirs}) Building "${path.resolve(dir)}"...`);
    logAndRunCommand("cargo", args, { cwd: path.join(dir, "meta") });
  }
};

const findBuildableDirs = (startDir: string) => {
  const results: string[] = [];
  if (isDirBuildable(startDir)) {
    results.push(startDir);
  }
  const files = fs.readdirSync(startDir);
  for (const file of files) {
    const p = path.join(startDir, file);
    if (fs.statSync(p).isDirectory()) {
      results.push(...findBuildableDirs(p));
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
