import { ChildProcess } from "node:child_process";
import {
  getCsproxyBinPath,
  getCsproxyDefaultConfigPath,
} from "@xsuite/chainsimulator";
import { spawnChildProcess } from "./childProcesses";

export const startCsproxyBin = async (
  debug: boolean = false,
  configFilePath?: string,
  nodeOverrideFilePath?: string,
): Promise<{
  server: ChildProcess;
  proxyUrl: string;
}> => {
  const csproxyBinPath = getCsproxyBinPath();
  const csproxyConfigFolder = getCsproxyDefaultConfigPath();

  const server = spawnChildProcess(`${csproxyBinPath}`, [
    "--server-port",
    "0",
    "--config",
    configFilePath ?? `${csproxyConfigFolder}/config.toml`,
    "--node-override-config",
    nodeOverrideFilePath ?? `${csproxyConfigFolder}/nodeOverride.toml`,
    "--node-configs",
    `${csproxyConfigFolder}/node/config`,
    "--proxy-configs",
    `${csproxyConfigFolder}/proxy/config`,
    "--skip-configs-download",
  ]);

  server.stderr.on("data", (data: Buffer) => {
    throw new Error(data.toString());
  });

  server.on("error", (error) => {
    throw error;
  });

  const proxyUrl = await new Promise<string>((resolve) => {
    server.stdout.on("data", (data: Buffer) => {
      if (debug) {
        console.log(data.toString());
      }

      const addressRegex =
        /chain simulator's is accessible through the URL ([\w\d.:]+)/;
      const match = data.toString().match(addressRegex);
      if (match) {
        resolve(`http://${match[1]}`);
      }
    });
  });

  return { server, proxyUrl };
};
