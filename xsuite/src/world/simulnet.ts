import { spawn } from "node:child_process";

export const startSimulnet = (): Promise<string> => {
  let getSproxyBinPath: () => string;
  try {
    getSproxyBinPath = require("@xsuite/simulnet").getSproxyBinPath;
  } catch (e) {
    throw new Error(
      'Trying to use @xsuite/simulnet without the required package installed. Run `npm install @xsuite/simulnet` to fix this'
    );
  }

  return new Promise((resolve, reject) => {
    const server = spawn(getSproxyBinPath());

    server.stdout.on("data", (data: Buffer) => {
      const addressRegex = /Server running on (http:\/\/[\w\d.:]+)/;
      const match = data.toString().match(addressRegex);
      if (match === null) {
        reject(new Error("Simulnet failed starting."));
      } else {
        resolve(match[1]);
      }
    });

    server.stderr.on("data", (data: Buffer) => {
      throw new Error(data.toString());
    });

    server.on("error", (error) => {
      throw error;
    });
  });
};
