const { spawn } = require("child_process");
const { test } = require("node:test");
const { lsproxyBinaryPath } = require(".");

test("binary starts", { timeout: 1000 }, async () => {
  const server = spawn(lsproxyBinaryPath);
  await new Promise((resolve) => {
    server.stdout.on("data", (data) => {
      if (/Server running on (http:\/\/[\w\d.:]+)/.test(data.toString())) {
        resolve();
      }
    });
  });
  server.kill();
});
