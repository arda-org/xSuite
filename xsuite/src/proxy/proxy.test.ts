import http from "node:http";
import { expect, test } from "vitest";
import { Proxy } from "./proxy";

test.concurrent("Proxy.fetchRaw - proxyUrl without path", async () => {
  using server = await createServer();
  const proxy = new Proxy(server.url);
  const url = await proxy.fetchRaw("/request");
  expect(url).toEqual(`${server.url}/request`);
});

test.concurrent("Proxy.fetchRaw - proxyUrl with non-empty path", async () => {
  using server = await createServer();
  const proxy = new Proxy(`${server.url}/path`);
  const url = await proxy.fetchRaw("/request");
  expect(url).toEqual(`${server.url}/path/request`);
});

test.concurrent("Proxy.fetchRaw - path not starting with slash", async () => {
  using server = await createServer();
  const proxy = new Proxy(`${server.url}/path`);
  expect(() => proxy.fetchRaw(`${server.url}/request`)).toThrow(
    "Invalid path.",
  );
});

const createServer = async () => {
  const server = http.createServer((req, res) => {
    res.end(`"${getServerUrl(server)}${req.url}"`);
  });

  const url = await new Promise<string>((resolve) => {
    server.listen(0, () => {
      const address = server.address();
      if (address === null || typeof address === "string") {
        throw new Error("Invalid address.");
      }
      resolve(getServerUrl(server));
    });
  });

  return {
    url,
    [Symbol.dispose]() {
      server.close();
    },
  };
};

const getServerUrl = (server: http.Server) => {
  const address = server.address();
  if (address === null || typeof address === "string") {
    throw new Error("Invalid address.");
  }
  return `http://localhost:${address.port}`;
};
