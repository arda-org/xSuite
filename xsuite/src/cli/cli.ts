import { Command } from "commander";
import { pkgVersion } from "../_pkg";
import { addBuildCmd } from "./buildCmd";
import { addInstallRustCmd } from "./installRustCmd";
import { addInstallRustKeyCmd } from "./installRustKeyCmd";
import { addNewCmd } from "./newCmd";
import { addNewWalletCmd } from "./newWalletCmd";
import { addRequestXegldCmd } from "./requestXegldCmd";
import { addTestRustCmd } from "./testRustCmd";
import { addTestScenCmd } from "./testScenCmd";
import { addUninstallRustCmd } from "./uninstallRustCmd";

export const getCli = () => {
  const cmd = new Command();
  cmd.version(pkgVersion);
  addInstallRustCmd(cmd);
  addInstallRustKeyCmd(cmd);
  addUninstallRustCmd(cmd);
  addNewCmd(cmd);
  addBuildCmd(cmd);
  addTestRustCmd(cmd);
  addTestScenCmd(cmd);
  addNewWalletCmd(cmd);
  addRequestXegldCmd(cmd);
  return cmd;
};
