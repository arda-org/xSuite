import fs from "node:fs";
import path from "node:path";
import { Command } from "commander";
import { pkgPath } from "../_pkgPath";
import { registerBuildCmd } from "./buildAction";
import { registerInstallRustCmd } from "./installRustCmd";
import { registerNewCmd } from "./newCmd";
import { registerNewWalletCmd } from "./newWalletCmd";
import { registerRequestXegldCmd } from "./requestXegldCmd";
import { registerTestRustCmd } from "./testRustCmd";
import { registerTestScenCmd } from "./testScenCmd";
import { registerUninstallRustCmd } from "./uninstallRustCmd";

const { version } = JSON.parse(
  fs.readFileSync(path.resolve(pkgPath, "package.json"), "utf-8"),
);

export const getCommand = () => {
  const cmd = new Command();
  cmd.version(version);
  registerInstallRustCmd(cmd);
  registerUninstallRustCmd(cmd);
  registerNewCmd(cmd);
  registerBuildCmd(cmd);
  registerTestRustCmd(cmd);
  registerTestScenCmd(cmd);
  registerNewWalletCmd(cmd);
  registerRequestXegldCmd(cmd);
  return cmd;
};
