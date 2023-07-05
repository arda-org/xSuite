import { spawn } from "node:child_process";
import { getFproxyBinPath } from "xsuite-fproxy";

export const startFProxyServer = (): Promise<string> => {
  return new Promise((resolve, reject) => {
    const server = spawn(getFproxyBinPath());

    server.stdout.on("data", (data: Buffer) => {
      const addressRegex = /Server running on (http:\/\/[\w\d.:]+)/;
      const match = data.toString().match(addressRegex);
      if (match === null) {
        reject(new Error("FProxy failed starting."));
      } else {
        resolve(match[1]);
      }
    });

    server.stderr.on("data", (data: Buffer) => {
      reject(new Error(data.toString()));
    });

    server.on("error", (error) => {
      reject(error);
    });
  });
};
