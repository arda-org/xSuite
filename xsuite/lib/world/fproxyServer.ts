import { spawn } from "node:child_process";
import os from "node:os";
import path from "node:path";

export const startFProxyServer = (): Promise<string> => {
  return new Promise((resolve, reject) => {
    let binaryName: string;
    if (os.platform() === "linux") {
      binaryName = "fproxy-Linux";
    } else if (os.platform() === "darwin") {
      binaryName = "fproxy-macOS";
    } else {
      throw new Error("Unsupported platform.");
    }

    const server = spawn(path.join(__dirname, "..", "..", "bin", binaryName));

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
