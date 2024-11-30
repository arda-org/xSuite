import { test, expect, afterEach } from "vitest";
import { envChain } from ".";

afterEach(() => {
  delete process.env.CHAIN;
});

test("envChain.name - devnet", () => {
  process.env.CHAIN = "devnet";
  expect(envChain.name()).toEqual("devnet");
});

test("envChain.name - testnet", () => {
  process.env.CHAIN = "testnet";
  expect(envChain.name()).toEqual("testnet");
});

test("envChain.name - mainnet", () => {
  process.env.CHAIN = "mainnet";
  expect(envChain.name()).toEqual("mainnet");
});

test("envChain.name - not set", () => {
  expect(() => envChain.name()).toThrow(
    "CHAIN environment variable is not set.",
  );
});

test("envChain.name - invalid", () => {
  process.env.CHAIN = "other";
  expect(() => envChain.name()).toThrow(
    "CHAIN environment variable value is invalid.",
  );
});

test("envChain.select - no value", () => {
  process.env.CHAIN = "devnet";
  expect(() => envChain.select({})).toThrow(
    "No value for CHAIN environment variable.",
  );
});

test("envChain.id - devnet", () => {
  process.env.CHAIN = "devnet";
  expect(envChain.id()).toEqual("D");
});

test("envChain.id - testnet", () => {
  process.env.CHAIN = "testnet";
  expect(envChain.id()).toEqual("T");
});

test("envChain.id - mainnet", () => {
  process.env.CHAIN = "mainnet";
  expect(envChain.id()).toEqual("1");
});

test("envChain.mvxProxyUrl - devnet", () => {
  process.env.CHAIN = "devnet";
  expect(envChain.mvxProxyUrl()).toEqual(
    "https://devnet-gateway.multiversx.com",
  );
});

test("envChain.mvxProxyUrl - testnet", () => {
  process.env.CHAIN = "testnet";
  expect(envChain.mvxProxyUrl()).toEqual(
    "https://testnet-gateway.multiversx.com",
  );
});

test("envChain.mvxProxyUrl - mainnet", () => {
  process.env.CHAIN = "mainnet";
  expect(envChain.mvxProxyUrl()).toEqual("https://gateway.multiversx.com");
});

test("envChain.minGasPrice - devnet", () => {
  process.env.CHAIN = "devnet";
  expect(envChain.minGasPrice()).toEqual(1_000_000_000);
});

test("envChain.minGasPrice - testnet", () => {
  process.env.CHAIN = "testnet";
  expect(envChain.minGasPrice()).toEqual(1_000_000_000);
});

test("envChain.minGasPrice - mainnet", () => {
  process.env.CHAIN = "mainnet";
  expect(envChain.minGasPrice()).toEqual(1_000_000_000);
});

test("envChain.mvxExplorerUrl - devnet", () => {
  process.env.CHAIN = "devnet";
  expect(envChain.mvxExplorerUrl()).toEqual(
    "https://devnet-explorer.multiversx.com",
  );
});

test("envChain.mvxExplorerUrl - testnet", () => {
  process.env.CHAIN = "testnet";
  expect(envChain.mvxExplorerUrl()).toEqual(
    "https://testnet-explorer.multiversx.com",
  );
});

test("envChain.mvxExplorerUrl - mainnet", () => {
  process.env.CHAIN = "mainnet";
  expect(envChain.mvxExplorerUrl()).toEqual("https://explorer.multiversx.com");
});

test("envChain.publicProxyUrl", () => {
  process.env.CHAIN = "mainnet";
  expect(envChain.publicProxyUrl()).toEqual("https://gateway.multiversx.com");
});

test("envChain.publicExplorerUrl", () => {
  process.env.CHAIN = "mainnet";
  expect(envChain.explorerUrl()).toEqual("https://explorer.multiversx.com");
});
