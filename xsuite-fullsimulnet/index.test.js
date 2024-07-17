const { spawn } = require("child_process");
const { test } = require("node:test");
const { fsproxyBinaryPath } = require(".");

test("binary starts", { timeout: 2000 }, async () => {
  const server = spawn(fsproxyBinaryPath);
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
