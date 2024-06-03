import { ChildProcess } from "node:child_process";
import path from "node:path";
import { getFsproxyBinPath } from "@xsuite/full-simulnet";
import { spawnChildProcess } from "./childProcesses";

export const startFsproxyBin = async (): Promise<{
  server: ChildProcess;
  proxyUrl: string;
}> => {
  const fsproxyBinPath = getFsproxyBinPath();

  const simulnetPkgPath = path.dirname(
    require.resolve("@xsuite/full-simulnet/package.json"),
  );

  const server = spawnChildProcess(
    `${fsproxyBinPath}`,
    [
      "--server-port",
      "0",
      "--node-override-config",
      `${simulnetPkgPath}/config/nodeOverride.toml`,
      "--skip-configs-download",
    ],
    { cwd: simulnetPkgPath },
  );

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
