import { Command } from "commander";
import { pkgVersion } from "../_pkg";
import { registerBuildCmd } from "./buildAction";
import { registerInstallRustCmd } from "./installRustCmd";
import { registerInstallRustKeyCmd } from "./installRustKeyCmd";
import { registerNewCmd } from "./newCmd";
import { registerNewWalletCmd } from "./newWalletCmd";
import { registerRequestXegldCmd } from "./requestXegldCmd";
import { registerTestRustCmd } from "./testRustCmd";
import { registerTestScenCmd } from "./testScenCmd";
import { registerUninstallRustCmd } from "./uninstallRustCmd";

export const getCommand = () => {
  const cmd = new Command();
  cmd.version(pkgVersion);
  registerInstallRustCmd(cmd);
  registerInstallRustKeyCmd(cmd);
  registerUninstallRustCmd(cmd);
  registerNewCmd(cmd);
  registerBuildCmd(cmd);
  registerTestRustCmd(cmd);
  registerTestScenCmd(cmd);
  registerNewWalletCmd(cmd);
  registerRequestXegldCmd(cmd);
  return cmd;
};
