import { test, expect, afterEach } from "vitest";
import { envChain } from "./index";

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

test("envChain.publicProxyUrl - devnet", () => {
  process.env.CHAIN = "devnet";
  expect(envChain.publicProxyUrl()).toEqual(
    "https://devnet-gateway.multiversx.com",
  );
});

test("envChain.publicProxyUrl - testnet", () => {
  process.env.CHAIN = "testnet";
  expect(envChain.publicProxyUrl()).toEqual(
    "https://testnet-gateway.multiversx.com",
  );
});

test("envChain.publicProxyUrl - mainnet", () => {
  process.env.CHAIN = "mainnet";
  expect(envChain.publicProxyUrl()).toEqual("https://gateway.multiversx.com");
});
