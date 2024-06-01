import { ChildProcess } from "node:child_process";
import { getFsproxyBinPath, getFsproxyConfigPath } from "@xsuite/full-simulnet";
import { spawnChildProcess } from "./childProcesses";

export const startFsproxyBin = async (): Promise<{
  server: ChildProcess;
  proxyUrl: string;
}> => {
  const fsproxyBinPath = getFsproxyBinPath();
  const fsproxyConfigFolder = getFsproxyConfigPath();

  const server = spawnChildProcess(`${fsproxyBinPath}`, [
    "--server-port",
    "0",
    "--config",
    `${fsproxyConfigFolder}/config.toml`,
    "--node-override-config",
    `${fsproxyConfigFolder}/nodeOverride.toml`,
    "--node-configs",
    `${fsproxyConfigFolder}/node/config`,
    "--proxy-configs",
    `${fsproxyConfigFolder}/proxy/config`,
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
