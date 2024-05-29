const { spawn } = require("child_process");
const { test } = require("node:test");
const { getFsproxyBinPath } = require(".");

test("binary starts", { timeout: 2000 }, async () => {
  const server = spawn(getFsproxyBinPath());
  await new Promise((resolve) => {
    server.stdout.on("data", (data) => {
      if (
        /chain simulator's is accessible through the URL ([\w\d.:]+)/.test(
          data.toString(),
        )
      ) {
        resolve();
      }
    });
  });
  server.kill();
});
