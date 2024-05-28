const { spawn } = require("child_process");
const { test } = require("node:test");
const { getLsproxyBinPath } = require(".");

test("binary starts", { timeout: 1000 }, async () => {
  const server = spawn(getLsproxyBinPath());
  await new Promise((resolve) => {
    server.stdout.on("data", (data) => {
      if (data.toString().startsWith("Server running on")) {
        resolve();
      }
    });
  });
  server.kill();
});
