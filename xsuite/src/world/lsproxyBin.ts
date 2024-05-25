import { ChildProcess } from "node:child_process";
import { getLsproxyBinPath } from "@xsuite/light-simulnet";
import { spawnChildProcess } from "./childProcesses";

export const startLsproxyBin = async (): Promise<{
  server: ChildProcess;
  proxyUrl: string;
}> => {
  const server = spawnChildProcess(getLsproxyBinPath());

  server.stderr.on("data", (data: Buffer) => {
    throw new Error(data.toString());
  });

  server.on("error", (error) => {
    throw error;
  });

  const proxyUrl = await new Promise<string>((resolve) => {
    server.stdout.on("data", (data: Buffer) => {
      const addressRegex = /Server running on (http:\/\/[\w\d.:]+)/;
      const match = data.toString().match(addressRegex);
      if (match) {
        resolve(match[1]);
      }
    });
  });

  return { server, proxyUrl };
};
