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

export class CLI extends Command {
  constructor() {
    super();
    this.version(pkgVersion);
    addInstallRustCmd(this);
    addInstallRustKeyCmd(this);
    addUninstallRustCmd(this);
    addNewCmd(this);
    addBuildCmd(this);
    addTestRustCmd(this);
    addTestScenCmd(this);
    addNewWalletCmd(this);
    addRequestXegldCmd(this);
  }

  run(c: string) {
    return this.parseAsync(c.split(" "), { from: "user" });
  }
}
