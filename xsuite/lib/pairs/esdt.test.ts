import { test, beforeEach, afterEach, expect } from "@jest/globals";
import { e } from "../enc";
import { FWorld, FWorldContract, FWorldWallet, readFileHex } from "../world";
import { getEsdtsKvs } from "./esdt";
import { kvsToPairs } from "./pairs";

let world: FWorld;
let wallet: FWorldWallet;
let contract: FWorldContract;

const fftId = "FFT-abcdef";
const sftId = "SFT-abcdef";

beforeEach(async () => {
  world = await FWorld.start();
  wallet = await world.createWallet({});
  contract = await world.createContract({
    code: readFileHex("contracts/esdt/output/esdt.wasm"),
    esdts: [
      {
        id: fftId,
        roles: ["ESDTRoleLocalMint"],
      },
      {
        id: sftId,
        roles: ["ESDTRoleNFTCreate", "ESDTRoleNFTAddQuantity"],
      },
    ],
  });
});

afterEach(async () => {
  await world.terminate();
});

test("getEsdtsKvs", async () => {
  expect(() => getEsdtsKvs([{ id: fftId, amount: -1n }])).toThrow(
    "Non-positive amount."
  );
  expect(() => getEsdtsKvs([{ id: sftId, nonce: -1, amount: 1n }])).toThrow(
    "Non-positive nonce."
  );
  const fftAmount = 10n;
  await wallet.callContract({
    callee: contract,
    functionName: "mint_and_send",
    functionArgs: [e.Str(fftId), e.U(fftAmount)],
    gasLimit: 10_000_000,
  });
  const sftAmount1 = 20n;
  const sftName1 = "Test 1";
  const sftRoyalties1 = 20;
  const sftHash1 = "0001";
  const sftUris1 = ["https://google.com"];
  const sftAttrs1 = e.Tuple(e.U8(0), e.U8(0), e.U8(0));
  await wallet.callContract({
    callee: contract,
    functionName: "nft_create_and_send",
    functionArgs: [
      e.Str(sftId),
      e.U(sftAmount1),
      e.Str(sftName1),
      e.U(sftRoyalties1),
      e.Buffer(sftHash1),
      sftAttrs1,
      e.List(...sftUris1.map((u) => e.Str(u))),
    ],
    gasLimit: 10_000_000,
  });
  const sftAmount2 = 50n;
  const sftName2 = "Test 2";
  const sftRoyalties2 = 50;
  const sftHash2 = "0002";
  const sftUris2 = ["https://facebook.com"];
  const sftAttrs2 = e.Tuple(e.U8(255), e.U8(255), e.U8(255));
  await wallet.callContract({
    callee: contract,
    functionName: "nft_create_and_send",
    functionArgs: [
      e.Str(sftId),
      e.U(sftAmount2),
      e.Str(sftName2),
      e.U(sftRoyalties2),
      e.Buffer(sftHash2),
      sftAttrs2,
      e.List(...sftUris2.map((u) => e.Str(u))),
    ],
    gasLimit: 10_000_000,
  });
  expect(
    kvsToPairs(
      getEsdtsKvs([
        { id: fftId, amount: fftAmount },
        { id: sftId, nonce: 1, amount: sftAmount1 },
        { id: sftId, nonce: 2, amount: sftAmount2 },
      ])
    )
  ).toEqual(await wallet.getAccountPairs());
  expect(
    kvsToPairs(
      getEsdtsKvs([
        {
          id: fftId,
          roles: ["ESDTRoleLocalMint"],
        },
        {
          id: sftId,
          roles: ["ESDTRoleNFTCreate", "ESDTRoleNFTAddQuantity"],
          lastNonce: 2,
        },
      ])
    )
  ).toEqual(await contract.getAccountPairs());
  expect(
    kvsToPairs(
      getEsdtsKvs([
        {
          id: sftId,
          nonce: 1,
          amount: 0n,
          saveNonce: true,
          properties: "01",
          name: sftName1,
          creator: contract,
          royalties: sftRoyalties1,
          hash: sftHash1,
          uris: sftUris1,
          attrs: sftAttrs1,
        },
        {
          id: sftId,
          nonce: 2,
          amount: 0n,
          saveNonce: true,
          properties: "01",
          name: sftName2,
          creator: contract,
          royalties: sftRoyalties2,
          hash: sftHash2,
          uris: sftUris2,
          attrs: sftAttrs2,
        },
      ])
    )
  ).toEqual(await world.getSystemAccountPairs());
});
